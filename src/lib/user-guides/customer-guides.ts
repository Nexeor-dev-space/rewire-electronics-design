import { defineGuide } from "./template";
import type { GuideDefinition } from "./types";

/** One guide per shopper journey. Shown on the storefront under Help. */
export const CUSTOMER_GUIDES: GuideDefinition[] = [
  defineGuide(
    "customer",
    "browsing",
    "Browsing the shop",
    "Find a device from the homepage, the categories, search, filters and sorting.",
    {
      purpose: "Find the device you want, from the homepage or by searching.",
      who: "Anyone. You do not need an account to browse.",
      steps: [
        "Open the homepage and scroll to see the latest releases and offers.",
        "Pick a category from the category bar, or choose Shop to see everything.",
        "Select the search icon, type at least two letters and pick a suggestion, or press Enter for all results.",
        "On the shop page use the filter panel on the left, or Filters on a phone. Tick the condition, grade, brand or storage you want and set a price range.",
        "Use Sort to order by price or newest.",
        "Use the page numbers under the grid to see more. Your filters stay as you move.",
      ],
      next: [
        "Select a product card to open its page.",
        "Active filters show as chips. Remove one with its chip, or select Clear all.",
      ],
      problems: [
        "No results found: select Clear search or Clear all and try fewer filters.",
        "A device is missing: In stock is ticked by default. Untick it to include items that are out of stock.",
      ],
    },
  ),
  defineGuide(
    "customer",
    "product-page",
    "Choosing a product",
    "Conditions and grades, storage and colour, add ons and extended warranty.",
    {
      purpose: "Choose the right version of a device and any extras.",
      who: "Anyone.",
      steps: [
        "Select a product card.",
        "Choose the storage, colour and condition. The price, photos and stock update as you choose.",
        "Read the specifications, what is included, the warranty and the terms further down.",
        "Tick any add ons, such as a case, a charger or extended warranty. Some add months of warranty, shown as plus 12 months warranty.",
        "Select Add to cart.",
      ],
      next: ["The item is in your cart. Open the cart from the header at any time."],
      problems: [
        "A combination is not offered: choose another storage, colour or condition.",
        "The page says the item is out of stock: pick another version, or join the waitlist if the page offers it.",
      ],
    },
  ),
  defineGuide(
    "customer",
    "cart-and-discount-codes",
    "Your cart and discount codes",
    "Change your cart and use a promo code.",
    {
      purpose: "Review what you are buying before you pay, and apply a promo code.",
      who: "Anyone can use the cart. Promo codes need an account.",
      steps: [
        "Open the cart from the header.",
        "Use the quantity stepper to change how many, or remove an item.",
        "Add or remove add ons on each item.",
        "If a price changed or an item became unavailable, the cart says so. Select Got it to accept a new price, and remove unavailable items.",
        "Select Proceed to checkout.",
        "Sign in, then enter your code in the promo field on the checkout summary and press Apply.",
      ],
      next: [
        "The discount shows in the summary. Select remove to take it off.",
        "Items added as a guest are merged into your account cart when you sign in.",
      ],
      problems: [
        "A code is refused: the message says why. It may not be active yet, expired, fully used, already used by you, not valid for these items, or need a minimum spend.",
      ],
    },
  ),
  defineGuide(
    "customer",
    "checkout",
    "Checking out",
    "Pay as a guest or with an account, by card, Apple Pay or cash on delivery.",
    {
      purpose: "Place an order and pay for it.",
      who: "Anyone. A guest can check out without an account.",
      steps: [
        "Select Proceed to checkout from the cart.",
        "Information: enter your email, phone number and delivery address. Choose the emirate and, where asked, the area.",
        "Delivery: choose a delivery method. The fee and the estimated time are shown.",
        "Payment: choose cash on delivery, card or Apple Pay.",
        "Review: check the items, add ons, discount, delivery fee, VAT and total, then select Place Order.",
        "For card or Apple Pay you go to the secure Stripe page to pay. Rewire never sees your card details.",
      ],
      next: [
        "The confirmation page shows your order number, which starts with RW, and an email is sent.",
        "Cash on delivery is confirmed straight away and you pay on arrival.",
        "After a card payment goes through you return to Rewire and the order is confirmed.",
      ],
      problems: [
        "You left the Stripe page: the order is saved but not confirmed. Pay within 30 minutes or contact support.",
        "To change a finished step, select Edit on it.",
      ],
    },
  ),
  defineGuide(
    "customer",
    "account-and-sign-in",
    "Your account and signing in",
    "Create an account, verify your email, sign in and reset a password.",
    {
      purpose: "Keep your orders, wishlist and addresses in one place.",
      who: "Anyone.",
      steps: [
        "Select the account icon, then Sign up.",
        "Enter your details and create a password.",
        "Open the email we send and verify your address. Orders you placed earlier as a guest with the same email then appear in your account.",
        "To sign in later, select the account icon and enter your email and password.",
        "If you forget your password, select Forgot password, enter your email, follow the link we send and choose a new password.",
      ],
      next: ["Your account pages are under the account icon."],
      problems: [
        "No verification email: check your spam folder, then ask for a new one.",
        "The reset link stopped working: ask for a new link.",
      ],
    },
  ),
  defineGuide(
    "customer",
    "track-order",
    "Tracking an order",
    "Follow an order as a guest, or claim a guest order into your account.",
    {
      purpose: "See where an order is, from placed to delivered.",
      who: "Anyone with the order number and the email used at checkout.",
      steps: [
        "Select Track Order in the account menu in the header, or on your order confirmation page.",
        "Enter the order number and the email you used at checkout.",
        "Follow the steps: Placed, Confirmed, Processing, Dispatched and Delivered.",
        "To keep the order in an account, sign up or sign in with the same email.",
      ],
      next: [
        "A guest order with your email then appears under My Orders in your account.",
        "To change or cancel an order, contact support before it is dispatched.",
      ],
      problems: ["The order is not found: check the order number and that the email is the one used at checkout."],
    },
  ),
  defineGuide(
    "customer",
    "my-account",
    "Your account pages",
    "Orders, addresses, wishlist, waitlists and settings.",
    {
      purpose: "Manage everything about your account.",
      who: "Signed in customers.",
      steps: [
        "Select the account icon to open your account.",
        "My Orders: see your history, follow tracking and download tax invoices.",
        "My Waitlists: see the releases you asked to be told about.",
        "Returns & Refunds: follow your return requests.",
        "Wishlist: select the heart on a product to save it, and the heart again to remove it.",
        "Saved Addresses: save and edit delivery addresses.",
        "Account Settings: change your details and password.",
      ],
      next: ["Saved addresses are offered at checkout."],
      problems: ["An order is missing: it may have been placed with a different email."],
    },
  ),
  defineGuide(
    "customer",
    "returns",
    "Returning an item",
    "Ask for a return and see what happens next.",
    {
      purpose: "Send back a device you no longer want, within the return window.",
      who: "Signed in customers with a delivered order.",
      steps: [
        "Select the account icon, then My Orders, and open the delivered order.",
        "Select Request a return, or Return this item on one line.",
        "Fill in the form and send it.",
        "Follow its progress under Returns & Refunds in your account.",
      ],
      next: [
        "We review the request, inspect the device when it arrives and record a refund.",
        "Each step shows under Returns & Refunds in your account.",
      ],
      problems: ["There is no return button: the return window may have passed. Contact support."],
    },
  ),
  defineGuide(
    "customer",
    "warranty",
    "Warranty and claims",
    "What is covered, where to see your warranty dates and how to ask for a claim.",
    {
      purpose: "Know what your warranty covers and what to do if something goes wrong.",
      who: "Signed in customers with a delivered order.",
      steps: [
        "Select the account icon, then My Orders, and open the order.",
        "Find Warranty until beside each item to see your end date.",
        "Read the Warranty page, linked in the footer, to see what is covered.",
        "If something goes wrong while the warranty is active, select Support in the footer and send us a message or raise a ticket. Include your order number and the device serial or IMEI.",
      ],
      next: [
        "Our team checks your device and raises the claim for you.",
        "We contact you about collection, assessment, and a repair or replacement.",
      ],
      problems: [
        "The warranty has not started: it starts when the order is delivered.",
        "A claim cannot be raised after the warranty has ended.",
      ],
    },
  ),
  defineGuide(
    "customer",
    "releases-and-waitlists",
    "Releases and waitlists",
    "Join a waitlist for a release and be told when it opens.",
    {
      purpose: "Be first to know when a limited release opens.",
      who: "Anyone with an email address.",
      steps: [
        "Select Upcoming Drops in the header.",
        "Open a release.",
        "Join the waitlist and enter your email.",
        "If you are signed in, see your waitlists under My Waitlists in your account.",
      ],
      next: ["We tell you when the release opens."],
      problems: ["No message arrived: check your spam folder."],
    },
  ),
  defineGuide(
    "customer",
    "policies-and-support",
    "Policies and getting help",
    "Read the policies and FAQ, and contact support.",
    {
      purpose: "Find an answer, or reach a person.",
      who: "Anyone.",
      steps: [
        "Select Support in the footer.",
        "Read Warranty, Shipping, Returns or the FAQ.",
        "If you still need help, select Contact, or Raise a ticket.",
        "We reply by email.",
      ],
      next: ["A person replies to every message."],
      problems: ["No reply yet: check the opening hours on the Support page."],
    },
  ),
];
