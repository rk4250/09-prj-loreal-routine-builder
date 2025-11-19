/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");

/* State management */
let allProducts = [];
let selectedProducts = [];
let conversationHistory = [];
let currentRoutine = null;

/* Cloudflare Worker URL - REPLACE WITH YOUR WORKER URL */
const WORKER_URL = "https://loreal-worker.renakalil19.workers.dev/";

/* ========================================
   INITIALIZATION
   ======================================== */

async function init() {
  allProducts = await loadProducts();
  loadSelectedFromStorage();
  displayPlaceholder();
  updateSelectedProductsUI();
  displayWelcomeMessage();
}

function displayPlaceholder() {
  productsContainer.innerHTML = `
    <div class="placeholder-message">
      <i class="fa-solid fa-sparkles" style="font-size: 48px; color: #ff003b; margin-bottom: 20px;"></i>
      <p>Select a category to discover products</p>
    </div>
  `;
}

function displayWelcomeMessage() {
  chatWindow.innerHTML = `
    <div class="chat-message assistant-message">
      <div class="message-avatar">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
      </div>
      <div class="message-content">
        <p>Welcome! I'm your L'Oréal beauty advisor. 🌟</p>
        <p>Select products from the catalog and click <strong>Generate Routine</strong> to receive a personalized skincare or beauty routine tailored just for you.</p>
        <p>After generating your routine, feel free to ask me any follow-up questions!</p>
      </div>
    </div>
  `;
}

/* ========================================
   PRODUCT LOADING & DISPLAY
   ======================================== */

async function loadProducts() {
  try {
    const response = await fetch("products.json");
    const data = await response.json();
    return data.products;
  } catch (error) {
    console.error("Error loading products:", error);
    return [];
  }
}

function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">
        <p>No products found in this category</p>
      </div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedProducts.some((p) => p.id === product.id);
      return `
        <div class="product-card ${isSelected ? "selected" : ""}" data-id="${
        product.id
      }">
          <img src="${product.image}" alt="${product.name}" loading="lazy">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p class="product-brand">${product.brand}</p>
            <button class="toggle-description-btn" data-id="${product.id}">
              <i class="fa-solid fa-info-circle"></i> Details
            </button>
            <div class="product-description" id="desc-${product.id}">
              ${product.description}
            </div>
            ${
              isSelected
                ? '<div class="selected-badge"><i class="fa-solid fa-check"></i></div>'
                : ""
            }
          </div>
        </div>
      `;
    })
    .join("");

  attachProductEventListeners();
}

function attachProductEventListeners() {
  // Product card selection
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      const isDescriptionBtn = e.target.closest(".toggle-description-btn");
      const isDescriptionArea = e.target.closest(".product-description");

      // If clicking the description button OR inside the description,
      // do NOT toggle selection
      if (isDescriptionBtn || isDescriptionArea) {
        return;
      }

      const productId = parseInt(card.dataset.id);
      toggleProductSelection(productId);
    });
  });

  // Description toggle buttons - ONLY way to show descriptions
  document.querySelectorAll(".toggle-description-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();

      const productId = btn.dataset.id;
      const description = document.getElementById(`desc-${productId}`);
      const isVisible = description.classList.contains("show");

      // Hide all descriptions first
      document.querySelectorAll(".product-description").forEach((desc) => {
        desc.classList.remove("show");
      });

      // Only show this description if it was hidden
      if (!isVisible) {
        description.classList.add("show");
      }
    });
  });
}

/* ========================================
   PRODUCT SELECTION
   ======================================== */

function toggleProductSelection(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  const existingIndex = selectedProducts.findIndex((p) => p.id === productId);

  if (existingIndex > -1) {
    // Deselect
    selectedProducts.splice(existingIndex, 1);
  } else {
    // Select
    selectedProducts.push(product);
  }

  saveSelectedToStorage();
  updateSelectedProductsUI();
  refreshProductCards();
}

function removeProduct(productId) {
  selectedProducts = selectedProducts.filter((p) => p.id !== productId);
  saveSelectedToStorage();
  updateSelectedProductsUI();
  refreshProductCards();
}

function refreshProductCards() {
  document.querySelectorAll(".product-card").forEach((card) => {
    const productId = parseInt(card.dataset.id);
    const isSelected = selectedProducts.some((p) => p.id === productId);

    if (isSelected) {
      card.classList.add("selected");
      if (!card.querySelector(".selected-badge")) {
        card
          .querySelector(".product-info")
          .insertAdjacentHTML(
            "beforeend",
            '<div class="selected-badge"><i class="fa-solid fa-check"></i></div>'
          );
      }
    } else {
      card.classList.remove("selected");
      const badge = card.querySelector(".selected-badge");
      if (badge) badge.remove();
    }
  });
}

function updateSelectedProductsUI() {
  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="empty-message">No products selected yet. Click on products above to add them to your routine.</p>
    `;
    generateRoutineBtn.disabled = true;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-tag">
        <span>${product.name}</span>
        <button class="remove-product-btn" data-id="${product.id}" title="Remove">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `
    )
    .join("");

  generateRoutineBtn.disabled = false;

  // Attach remove handlers
  document.querySelectorAll(".remove-product-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const productId = parseInt(btn.dataset.id);
      removeProduct(productId);
    });
  });
}

/* ========================================
   LOCAL STORAGE
   ======================================== */

function saveSelectedToStorage() {
  const ids = selectedProducts.map((p) => p.id);
  localStorage.setItem("loreal-selected-products", JSON.stringify(ids));
}

function loadSelectedFromStorage() {
  const stored = localStorage.getItem("loreal-selected-products");
  if (stored) {
    const ids = JSON.parse(stored);
    selectedProducts = allProducts.filter((p) => ids.includes(p.id));
  }
}

function clearAllSelections() {
  selectedProducts = [];
  saveSelectedToStorage();
  updateSelectedProductsUI();
  refreshProductCards();
}

/* ========================================
   AI ROUTINE GENERATION
   ======================================== */

async function generateRoutine() {
  if (selectedProducts.length === 0) {
    alert("Please select at least one product to generate a routine.");
    return;
  }

  // Disable button and show loading
  generateRoutineBtn.disabled = true;
  generateRoutineBtn.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

  // Add user message to chat
  addMessageToChat(
    "user",
    `Generate a personalized routine using these ${selectedProducts.length} products.`
  );

  // Show typing indicator
  showTypingIndicator();

  try {
    // Prepare prompt
    const productsData = selectedProducts.map((p) => ({
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
    }));

    const prompt = `You are an expert beauty and skincare advisor for L'Oréal. A customer has selected the following products:

${JSON.stringify(productsData, null, 2)}

Please create a personalized, step-by-step routine using ONLY these selected products. Include:
1. The order in which to use them (AM/PM routines if applicable)
2. How to apply each product
3. Why each product is beneficial
4. Any important tips or precautions

Be warm, professional, and helpful. Format your response in a clear, easy-to-read manner.`;

    const response = await callOpenAI([
      {
        role: "system",
        content:
          "You are a professional L'Oréal beauty advisor. You provide personalized skincare, haircare, makeup, and beauty routines. You are knowledgeable, friendly, and always put the customer's needs first.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Store routine and conversation
    currentRoutine = response;
    conversationHistory.push(
      {
        role: "user",
        content: prompt,
      },
      {
        role: "assistant",
        content: response,
      }
    );

    // Display response
    removeTypingIndicator();
    addMessageToChat("assistant", response);
  } catch (error) {
    removeTypingIndicator();
    addMessageToChat(
      "assistant",
      "I apologize, but I'm having trouble generating your routine right now. Please try again in a moment."
    );
    console.error("Error generating routine:", error);
  } finally {
    generateRoutineBtn.disabled = false;
    generateRoutineBtn.innerHTML =
      '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate Routine';
  }
}

/* ========================================
   CHAT FUNCTIONALITY
   ======================================== */

async function handleChatSubmit(e) {
  e.preventDefault();

  const message = userInput.value.trim();
  if (!message) return;

  // Clear input
  userInput.value = "";

  // Add user message
  addMessageToChat("user", message);

  // Show typing indicator
  showTypingIndicator();

  try {
    // Build context
    const messages = [
      {
        role: "system",
        content: `You are a professional L'Oréal beauty advisor. You help customers with skincare, haircare, makeup, fragrance, and beauty routines. You are knowledgeable, friendly, and supportive.

${
  currentRoutine
    ? `The customer has generated a routine. Here are their selected products:\n${selectedProducts
        .map((p) => `- ${p.brand} ${p.name}`)
        .join("\n")}`
    : "The customer has not yet generated a routine."
}

Answer questions about beauty, skincare, haircare, makeup, and their routine. Keep responses helpful and concise.`,
      },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      {
        role: "user",
        content: message,
      },
    ];

    const response = await callOpenAI(messages);

    // Store conversation
    conversationHistory.push(
      {
        role: "user",
        content: message,
      },
      {
        role: "assistant",
        content: response,
      }
    );

    // Display response
    removeTypingIndicator();
    addMessageToChat("assistant", response);
  } catch (error) {
    removeTypingIndicator();
    addMessageToChat(
      "assistant",
      "I apologize, but I'm having trouble responding right now. Please try again."
    );
    console.error("Error in chat:", error);
  }
}

function addMessageToChat(role, content) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${role}-message`;

  if (role === "assistant") {
    messageDiv.innerHTML = `
      <div class="message-avatar">
        <i class="fa-solid fa-wand-magic-sparkles"></i>
      </div>
      <div class="message-content">${formatMessageContent(content)}</div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="message-content">${formatMessageContent(content)}</div>
      <div class="message-avatar user-avatar">
        <i class="fa-solid fa-user"></i>
      </div>
    `;
  }

  chatWindow.appendChild(messageDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function formatMessageContent(content) {
  // Convert line breaks to paragraphs
  return content
    .split("\n\n")
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function showTypingIndicator() {
  const indicator = document.createElement("div");
  indicator.className = "typing-indicator";
  indicator.id = "typing-indicator";
  indicator.innerHTML = `
    <div class="message-avatar">
      <i class="fa-solid fa-wand-magic-sparkles"></i>
    </div>
    <div class="typing-dots">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;
  chatWindow.appendChild(indicator);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  if (indicator) indicator.remove();
}

/* ========================================
   OPENAI API CALL (via Cloudflare Worker)
   ======================================== */

async function callOpenAI(messages) {
  const response = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/* ========================================
   EVENT LISTENERS
   ======================================== */

categoryFilter.addEventListener("change", async (e) => {
  const selectedCategory = e.target.value;
  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory
  );
  displayProducts(filteredProducts);
});

generateRoutineBtn.addEventListener("click", generateRoutine);

chatForm.addEventListener("submit", handleChatSubmit);

/* ========================================
   START THE APP
   ======================================== */

init();
