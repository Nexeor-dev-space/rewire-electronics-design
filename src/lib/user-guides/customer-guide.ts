import type { UserGuide } from "./types";

/** What shoppers do on the storefront, for staff who support them. */
export const CUSTOMER_GUIDE: UserGuide = {
  title: "Customer Guide",
  description:
    "How a shopper uses the website, from finding a product to receiving the order. Use it to answer customer questions.",
  sections: [
    {
      id: "navigate",
      title: "Finding your way around",
      steps: [
        "The header has the logo, search, account, the wishlist heart and the cart. The category bar sits under it.",
        "The About menu explains how Rewire inspects and grades devices, and holds the FAQ.",
        "The footer links to Warranty, Shipping, Returns, Terms, Privacy and Support.",
        "On a phone, a bottom bar gives quick access to the main pages.",
      ],
    },
    {
      id: "account",
      title: "Creating an account",
      intro:
        "Shoppers can browse without one. An account lets them save a wishlist, use promo codes and see all their orders.",
      steps: [
        "Select the account icon, then Sign up.",
        "Enter details and create a password.",
        "Check the email and verify the address. Orders placed earlier as a guest with the same email then appear in the account.",
      ],
    },
    {
      id: "browse",
      title: "Browsing products",
      steps: [
        "Pick a category from the category bar, or choose Shop to see everything.",
        "Each card shows the product, its condition and its price.",
        "Use Sort to order by price or newest.",
        "Use the page numbers under the grid to move through results. Filters stay as you move.",
      ],
    },
    {
      id: "search",
      title: "Searching",
      steps: [
        "Select the search icon in the header.",
        "Type at least two letters. Suggestions appear as you type.",
        "Pick a suggestion, or press Enter to see all results.",
        "If nothing matches, the page says No results found. Select Clear search to start again.",
      ],
    },
    {
      id: "filter",
      title: "Filtering",
      intro: "On the shop page use the filter panel on the left, or Filters on a phone.",
      steps: [
        "Availability. In stock is ticked by default. Untick it to include out of stock items.",
        "Category, Condition, Grade, Brand and Storage. Tick as many as you like.",
        "Price. Set the range you want.",
        "Active filters appear as chips. Remove one with its chip, or select Clear all.",
      ],
    },
    {
      id: "product",
      title: "Looking at a product",
      steps: [
        "Select a product card.",
        "Choose the storage, colour and condition. The price, photos and stock update.",
        "Read the specifications, what is included, the warranty and the terms further down.",
        "Tick any add-ons, such as a case, charger or extended warranty. Some add months of warranty, shown as plus 12 months warranty.",
      ],
    },
    {
      id: "cart",
      title: "Adding to the cart",
      steps: [
        "Select Add to cart.",
        "Use the quantity stepper to change how many.",
        "Open the cart from the header at any time.",
        "On the cart page change quantity, add or remove add-ons, or remove an item.",
        "If a price changed or an item became unavailable, the cart says so. Select Got it to accept a new price, and remove unavailable items before continuing.",
        "Select Proceed to checkout.",
      ],
      notes: [
        "The cart is saved. Items added as a guest are merged into the account cart after signing in.",
      ],
    },
    {
      id: "wishlist",
      title: "Wishlist",
      steps: [
        "Select the heart on a product card or product page to save it.",
        "Open the wishlist from the header or from the account.",
        "Select the heart again to remove an item, or add it to the cart from the wishlist page.",
      ],
    },
    {
      id: "promo",
      title: "Promo codes",
      steps: [
        "Sign in. Promo codes need an account.",
        "On the checkout summary, enter the code in the promo field and press Apply or Enter.",
        "The discount shows in the summary. Select remove to take it off.",
        "If the code is refused, the message says why: not active yet, expired, fully used, already used by this customer, not valid for these items, or a minimum spend is needed.",
      ],
    },
    {
      id: "checkout",
      title: "Checkout",
      intro:
        "Checkout has four steps, taken in order. Select Edit on a finished step to change it.",
      steps: [
        "Information. Email, phone number and delivery address. Choose the emirate. Where delivery is by area, pick the area from the list.",
        "Delivery. Choose a delivery method. The fee and estimated time are shown.",
        "Payment. Choose how to pay.",
        "Review. Check items, add-ons, promo discount, delivery fee, VAT and total, then select Place Order.",
      ],
    },
    {
      id: "payment",
      title: "Payment",
      steps: [
        "Cash on delivery. The order is confirmed straight away and the customer pays on arrival.",
        "Card or Apple Pay. After placing the order the customer goes to Stripe's secure page to pay. Rewire never sees card details.",
        "When payment goes through the customer returns to Rewire and the order is confirmed.",
        "If the customer leaves the Stripe page, the order is saved but not confirmed. They should pay within 30 minutes or contact support.",
      ],
    },
    {
      id: "after-order",
      title: "After the order",
      steps: [
        "The confirmation page shows the order number, which starts with RW.",
        "A confirmation email is sent.",
        "Signed in: Account, then Orders, to follow progress and download the tax invoice.",
        "Guest: Track Order, then enter the order number and email.",
        "Order steps are Placed, Confirmed, Processing, Dispatched and Delivered. To change or cancel an order, the customer contacts support before it is dispatched.",
      ],
    },
    {
      id: "service",
      title: "Warranty, returns and support",
      steps: [
        "Warranty starts on delivery. The order page shows Warranty until for each item.",
        "Returns. Within the return window open the delivered order and select Request a return, or Return this item on one line. Progress shows under Account, then Returns.",
        "Support. Select Support in the footer to read the FAQ or raise a ticket. Tickets are under Account, then Tickets.",
      ],
    },
    {
      id: "account-pages",
      title: "The account pages",
      table: {
        head: ["Page", "What it is for"],
        rows: [
          ["Orders", "History, tracking and invoices"],
          ["Wishlist", "Saved products"],
          ["Addresses", "Saved delivery addresses"],
          ["Returns", "Return requests and refunds"],
          ["Tickets", "Support conversations"],
          ["Waitlists", "Releases the customer asked to be told about"],
          ["Settings", "Details and password"],
        ],
      },
    },
    {
      id: "password",
      title: "Forgot password",
      steps: [
        "Go to Sign in, then Forgot password.",
        "Enter the email and follow the link that is sent.",
        "Choose a new password.",
      ],
    },
  ],
};
