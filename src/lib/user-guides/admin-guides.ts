import { defineGuide, unavailableGuide } from "./template";
import type { GuideDefinition } from "./types";

/**
 * One guide per Admin Panel module, in sidebar order. A guide's slug is its
 * navigation key in `src/lib/admin-nav.ts`, which is how the Help link finds
 * the guide for the screen you are on. Placeholder modules say so and
 * describe nothing planned.
 */

const a = (slug: string, title: string, summary: string, text: Parameters<typeof defineGuide>[4]) =>
  defineGuide("admin", slug, title, summary, text);

export const ADMIN_GUIDES: GuideDefinition[] = [
  a("getting-started", "Getting started", "Sign in, understand your role and find your way around.", {
    purpose: "Learn how to open the Admin Panel and move around it.",
    who: "Every staff member.",
    steps: [
      "Open /admin on the site and sign in with your staff account.",
      "You land on the Dashboard.",
      "Use the left sidebar to open a screen. It groups screens into areas such as Catalogue, Sales and Service.",
      "Use the breadcrumb at the top to see where you are and to go back.",
      "Select Help for this screen at the top right of any screen to open its guide.",
      "To find a record, use the search box at the top of its list.",
    ],
    more: [
      {
        id: "access",
        title: "What each access level can do",
        steps: [
          "No access: the screen is hidden from your sidebar.",
          "View: you can open the screen and read it.",
          "Edit: you can also add and change records.",
          "Full access: you can also delete, publish and restore, where the screen has those actions.",
        ],
      },
    ],
    next: [
      "Every change you make is written to the Change Log with who made it and when.",
      "Your role decides which screens you see. An admin sets it under Governance, then Roles.",
    ],
    problems: [
      "A menu item is missing: your role does not include that area. Ask an admin.",
      "A button is hidden or disabled: your role does not allow that action.",
    ],
  }),
  a("dashboard", "Dashboard", "Today's orders, the release on sale, warranty claims waiting and stock running short.", {
    purpose: "See the day at a glance.",
    who: "Every staff member.",
    steps: [
      "Select Overview, then Dashboard.",
      "Read the figures for orders taken, the release on sale, warranty claims waiting and stock running short.",
      "Select a figure to open the screen behind it.",
    ],
    next: ["The figures update as orders and claims arrive."],
    problems: ["A figure is zero: nothing matches yet today."],
  }),
  a("products", "Products", "Add and edit products, their variants, images and stock.", {
    purpose: "Add the devices you sell and keep their price and stock right.",
    who: "Staff with Edit access to Products. Publishing and deleting need Full access.",
    steps: [
      "Go to Catalogue, then Products.",
      "Select Add product.",
      "Fill in the basics: name, slug, SKU, brand, category and description.",
      "Add at least one variant. A variant carries storage, colour, condition, grade, battery health, price and stock.",
      "Upload images. Choose a colour for an image so it shows with that colour, or leave All colours.",
      "Add specifications.",
      "Pick the add ons this product offers, up to 4. Leave the price blank to charge the catalogue price, or enter an override.",
      "Fill the SEO fields if needed.",
      "Select Save, then set the status to Published. A product needs at least one image to publish.",
    ],
    next: [
      "Published products show on the storefront straight away.",
      "Unpublish or Archive hides a product but keeps it. Carts show the line as unavailable.",
      "Delete moves a product to Trash. Restore it under Governance, then Trash, then Products.",
    ],
    problems: [
      "Slug and SKU must be unique.",
      "Two variants cannot share the same condition, grade, storage and colour.",
    ],
  }),
  a("categories", "Categories", "The category tree the shop and the feeds read.", {
    purpose: "Set up categories first, because every product needs one.",
    who: "Staff with Edit access to Categories.",
    steps: [
      "Go to Catalogue, then Categories.",
      "Select Add category.",
      "Fill in the name, slug, type, optional parent, image, description and position.",
      "Tick Show in the storefront menus and home page for a parent category you want in the menus.",
      "Choose a status: Draft, Published or Archived.",
      "Select Save.",
    ],
    next: ["Only Published categories show to shoppers."],
    problems: ["A category with products or child categories cannot be deleted. Archive it instead."],
  }),
  a("brands", "Brands", "Brand records and logos.", {
    purpose: "Keep the brands your products belong to.",
    who: "Staff with Edit access to Brands.",
    steps: [
      "Go to Catalogue, then Brands.",
      "Select Add brand.",
      "Enter the name and upload the logo.",
      "Select Save.",
    ],
    next: ["The brand can be chosen on a product."],
    problems: ["A brand with products cannot be deleted."],
  }),
  a("bulk-upload", "Bulk Product Upload", "Add many products at once from a spreadsheet.", {
    purpose: "Import many products and variants in one go.",
    who: "Staff with Create access to Bulk Product Upload.",
    steps: [
      "Go to Catalogue, then Bulk Product Upload.",
      "Download the CSV template.",
      "Fill it in, one row per variant, and upload it.",
      "Review the preview and fix any row marked with an error.",
      "Confirm the import.",
    ],
    next: ["Open Upload History to see every run and its result."],
    problems: ["A row is marked with an error: the message says which field to fix. Fix it in the file and upload again."],
  }),
  a("add-ons", "Add-ons", "Optional extras such as cases, chargers and extended cover.", {
    purpose: "Offer extras next to a device.",
    who: "Staff with Edit access to Add-ons.",
    steps: [
      "Go to Catalogue, then Add-ons.",
      "Select Add add on, or use the row actions to edit one.",
      "Enter the Name and a one line Note.",
      "Choose the Kind and enter the Price.",
      "For the Protection kind, enter Extra warranty in months.",
      "Tick Offered to shoppers to switch it on, and tag it as Most chosen if it should carry that badge.",
      "Either tick Offer on every product, or choose the categories it applies to.",
      "Select Save changes.",
    ],
    next: [
      "A product with its own add on picks shows only those. Otherwise it shows add ons for its category plus the ones offered on every product.",
    ],
    problems: ["An add on does not show: check that Offered to shoppers is ticked."],
  }),
  a("homepage", "Homepage Builder", "Banners, brand and category rows, deals and their order.", {
    purpose: "Change what the homepage shows: banners, featured brands, popular and curated categories, best deals and season deals.",
    who: "Staff with Edit access to Homepage Builder. Publishing needs Publish access.",
    steps: [
      "Go to Storefront, then Homepage Builder.",
      "Use the arrows or drag to reorder sections, and the eye control to hide one.",
      "Select a section to edit its text, image, button and linked items.",
      "Add a banner, a brand row, a category row or a deal with Add section.",
      "Use the preview to check your changes.",
      "Select Publish now.",
    ],
    next: ["Until you publish, visitors see the last published version."],
    problems: ["A change is not on the site: it is a draft until you publish."],
  }),
  a("navigation", "Navigation", "The About menu, the footer and the mobile bottom bar.", {
    purpose: "Change the links in the header About menu, the footer and the mobile bottom bar.",
    who: "Staff with Edit access to Navigation. Publishing needs Publish access.",
    steps: [
      "Go to Storefront, then Navigation.",
      "Edit the groups, links, icons and order.",
      "Select Publish.",
    ],
    next: ["The storefront shows the published version."],
    problems: ["A link is refused: use a page on this site, starting with /, or a full https address."],
  }),
  a("content", "Content & Policies", "Policy pages and the FAQ.", {
    purpose: "Edit the Warranty, Terms, Shipping, FAQ, Privacy and Returns pages.",
    who: "Staff with Edit access to Content & Policies. Publishing needs Publish access.",
    steps: [
      "Go to Storefront, then Content & Policies.",
      "Pick a page.",
      "Edit the content with the editor and set the SEO fields.",
      "Select Save, and publish when it is ready.",
    ],
    next: ["FAQ questions show on the About page and on the FAQ page."],
    problems: ["A page is not on the site: check that it is published."],
  }),
  a("help-guides", "Help Guides", "Edit the customer help pages and the admin guides.", {
    purpose: "Change the wording, screenshots and recording of any guide without a deploy.",
    who: "Staff with Edit access to Help Guides.",
    steps: [
      "Go to Storefront, then Help Guides.",
      "Select a guide.",
      "Change the title, summary, steps and notes.",
      "To add a screenshot, select Upload image on the step.",
      "To add a recording, paste the link to a video file.",
      "Select Save.",
    ],
    next: [
      "Customer guides show on the storefront under Help.",
      "Every guide shows the date it was last updated.",
      "Reset to built in text removes your changes to a guide.",
    ],
    problems: [
      "The recording does not play: the link must go straight to a video file that ends in .mp4 or .webm.",
      "A screenshot is refused: use a PNG, JPEG, WebP or AVIF image of 2 MB or less.",
    ],
  }),
  a("releases", "Releases", "Release dates, stock allocation, purchase caps and waitlists.", {
    purpose: "Plan a release and allocate stock to it.",
    who: "Staff with Edit access to Releases.",
    steps: [
      "Go to Sales, then Releases.",
      "Create a release and set its date.",
      "Allocate stock per variant and set any purchase caps.",
      "Set visibility, then publish.",
    ],
    next: ["Shoppers can join the waitlist before it opens."],
    problems: ["A release is not visible: check its visibility and date."],
  }),
  a("orders", "Orders", "Every order, its payment, delivery and customer.", {
    purpose: "Follow an order from payment to delivery.",
    who: "Staff with Edit access to Orders.",
    steps: [
      "Go to Sales, then Orders.",
      "Search by order number, email or last name. Filter by status or payment.",
      "Open an order to see its items, history, payment, delivery and customer.",
      "In Status, select the next step button. You can add a note the customer will see.",
      "In Payment, mark the order paid, unpaid or refunded where allowed. Marking a card order paid also confirms it.",
      "Save the tracking number and any staff note in Delivery.",
      "Select Download invoice for a PDF tax invoice.",
    ],
    next: [
      "The order moves through Awaiting payment, Confirmed, Processing, Dispatched and Delivered.",
      "Cancelling asks for confirmation and puts stock back.",
    ],
    problems: ["An order cannot be cancelled: cancelling is only possible until it is Dispatched."],
  }),
  a("fulfilment", "Fulfilment", "The queue of orders to pack and send.", {
    purpose: "Pack and send orders, and start the warranty.",
    who: "Staff with Edit access to Fulfilment.",
    steps: [
      "Go to Sales, then Fulfilment.",
      "The queue lists Confirmed, Processing and Dispatched orders, oldest first.",
      "Enter the tracking number and the Serial or IMEI for each device, then select Save.",
      "Select Move to the next step.",
    ],
    next: ["Moving an order to Delivered starts the warranty for each item."],
    problems: ["An order is missing from the queue: only Confirmed, Processing and Dispatched orders are listed."],
  }),
  a("warranty", "Warranty & Claims", "Devices by serial or IMEI, their warranty dates and claims.", {
    purpose: "Look up a device and raise or move a warranty claim. Customers ask for a claim through Support, and staff raise it here.",
    who: "Staff with Edit access to Warranty & Claims.",
    steps: [
      "Go to Service, then Warranty & Claims.",
      "Look up the device by serial or IMEI, and open it.",
      "Check that the warranty is Active and the serial is recorded.",
      "Select Raise claim, describe the issue and save.",
      "On the claim, use the step button to move it on: Serial verification, Collection, Assessment, then Repair or Replacement, then Returned to customer.",
      "To close a claim that fails verification or assessment, select Decline claim.",
    ],
    next: [
      "Each change is recorded with who made it, when, and an optional note.",
      "A claim you raised keeps moving through its steps even after the warranty ends.",
    ],
    problems: [
      "Raise claim is refused: the warranty must be Active, the device must have a serial recorded, and it must have no open claim.",
      "The warranty starts when the order is delivered. The serial is entered in Fulfilment.",
    ],
  }),
  a("returns", "Returns", "Return requests, inspection and refunds.", {
    purpose: "Handle a return from request to refund.",
    who: "Staff with Edit access to Returns.",
    steps: [
      "Go to Service, then Returns.",
      "Open a request and review it.",
      "Move it on: Approved or Declined, then In transit, Received and Inspecting.",
      "Select Record refund once you have paid the customer. The refund itself is paid outside the system.",
      "To change how many days customers have to return, use Return window at the top of the screen.",
    ],
    next: ["The customer sees each step under Returns & Refunds in their account."],
    problems: ["A customer cannot request a return: the return window has passed. You can change its length with Return window on this screen."],
  }),
  a("support", "Support Tickets", "Customer conversations and their resolution.", {
    purpose: "Answer customers and track each conversation.",
    who: "Staff with Edit access to Support Tickets. Assigning to anyone needs Full access.",
    steps: [
      "Go to Service, then Support Tickets.",
      "Open a ticket and write a reply.",
      "Change its status, priority or category.",
      "Assign it to a team member.",
    ],
    next: ["The customer receives your reply by email."],
    problems: ["You cannot assign a ticket: assigning to anyone needs Full access."],
  }),
  a("staff", "Staff", "The people who can sign in to the Admin Panel.", {
    purpose: "Add staff and give them a role.",
    who: "Admins only.",
    steps: [
      "Go to Service, then Users, then Staff.",
      "Add a staff account and enter their details.",
      "Choose a role for them.",
      "Save.",
    ],
    next: ["The staff member sees only the screens their role allows."],
    problems: ["A role is missing from the list: create it under Governance, then Roles."],
  }),
  a("customers", "Customers", "Customer records and their saved addresses.", {
    purpose: "Look up a customer and their details.",
    who: "Staff with access to Customers.",
    steps: [
      "Go to Service, then Users, then Customers.",
      "Search for the customer.",
      "Open the record to see their contact details and saved addresses.",
    ],
    next: ["Changes show in the Change Log."],
    problems: ["A customer is not found: they may have checked out as a guest. Look under Orders."],
  }),
  a("campaigns", "Campaigns", "Scheduled campaigns and the product discounts they apply.", {
    purpose: "Run a sale on chosen products for a set time.",
    who: "Staff with Edit access to Campaigns. Publishing needs Publish access.",
    steps: [
      "Go to Marketing, then Campaigns.",
      "Create a campaign and choose its type.",
      "Set the dates and choose the products and discounts.",
      "Publish it.",
    ],
    next: ["Prices change on the storefront while the campaign runs."],
    problems: ["A campaign has no effect: check that it is published and inside its dates."],
  }),
  a("messages", "Marketing Messages", "The history of messages sent to customers.", {
    purpose: "See which messages were sent, failed or skipped.",
    who: "Staff with View access to Marketing Messages.",
    steps: [
      "Go to Marketing, then Marketing Messages.",
      "Filter the history.",
      "Open a row to see its detail.",
    ],
    next: ["This screen is read only."],
    problems: ["A message failed: the detail says why."],
  }),
  a("coupons", "Discount Codes", "Coupon codes, their conditions and limits.", {
    purpose: "Create a code customers can use at checkout.",
    who: "Staff with Edit access to Discount Codes.",
    steps: [
      "Go to Marketing, then Discount Codes.",
      "Select Add.",
      "Enter the code. Use 3 to 32 letters, numbers, hyphens or underscores. It is stored in capitals.",
      "Choose percent or fixed amount, set the start and end dates, a minimum order and usage limits.",
      "Optionally limit it to products or categories.",
      "Select Save.",
    ],
    next: ["Customers enter the code at checkout."],
    problems: ["A code that has been used on orders cannot be deleted. Switch it off instead."],
  }),
  a("api-keys", "API Keys", "Analytics and site verification IDs, and the status of email and Stripe.", {
    purpose: "Connect analytics and check that email and payments are working.",
    who: "Staff with Edit access to Integrations, API Keys.",
    steps: [
      "Go to Integrations, then API Keys.",
      "Enter the Google Analytics, Clarity, Search Console and Meta Pixel IDs.",
      "Check the status of email and Stripe, and run the test if you need to.",
      "Save.",
    ],
    next: ["The storefront starts using the IDs you saved."],
    problems: ["A test fails: check the status message and ask a developer to check the connection."],
  }),
  unavailableGuide("google-merchant", "Google Merchant"),
  unavailableGuide("meta-catalog", "Meta Catalog"),
  unavailableGuide("product-feeds", "Product Feeds"),
  a("reports", "Reports", "Sales, service and inventory figures.", {
    purpose: "See how the shop is doing and export the figures.",
    who: "Staff with View access to Reports.",
    steps: [
      "Go to Governance, then Reports.",
      "Choose the dates and filters.",
      "Read the figures.",
      "Export a CSV if you need one.",
    ],
    next: ["Reports are read only."],
    problems: ["A date range is refused: choose a shorter range."],
  }),
  a("change-log", "Change Log", "Who changed what, and when.", {
    purpose: "Check who made a change and what it was.",
    who: "Staff with View access to Change Log.",
    steps: [
      "Go to Governance, then Change Log.",
      "Filter by module, action or search.",
      "Open an entry to see the value before and after.",
    ],
    next: ["The log is read only."],
    problems: ["A change is not listed: a save that changed nothing is not logged."],
  }),
  a("delivery", "Delivery Zones", "Emirates, their areas and delivery rates.", {
    purpose: "Set where you deliver and what it costs.",
    who: "Staff with Edit access to Delivery Zones.",
    steps: [
      "Go to Governance, then Delivery Zones.",
      "Open an emirate.",
      "Change its rate and the areas it covers.",
      "Save.",
    ],
    next: ["Turning an area off removes it from the checkout list."],
    problems: ["An area is missing at checkout: check that it is switched on."],
  }),
  a("vat", "VAT & Configuration", "The VAT rate and the general settings.", {
    purpose: "Set the VAT rate, the low stock threshold, store contact details and invoice details.",
    who: "Staff with Edit access to VAT & Configuration.",
    steps: [
      "Go to Governance, then VAT & Configuration.",
      "Change the setting you need.",
      "Save.",
    ],
    next: ["The cart, checkout and invoices use the new value from then on."],
    problems: ["Old orders did not change: a new rate applies to new orders."],
  }),
  a("roles", "Roles", "Which screens and actions each staff account can use.", {
    purpose: "Create a role and choose what it can do.",
    who: "Admins only.",
    steps: [
      "Go to Governance, then Roles.",
      "Select Add role and name it.",
      "For each screen choose an access level: No access, View, Edit or Full access.",
      "Save.",
      "Assign the role under Service, then Users, then Staff.",
    ],
    next: ["Staff with the role see only the screens it allows."],
    problems: ["A screen is missing from the role: some screens are for Admins only."],
  }),
  a("trash", "Trash", "Deleted products and users, held for restore.", {
    purpose: "Restore something deleted by mistake, or delete it for good.",
    who: "Staff with access to Trash. Restoring and deleting need Full access.",
    steps: [
      "Go to Governance, then Trash.",
      "Open Products or Users.",
      "Select Restore on the record, or delete it permanently.",
    ],
    next: ["A restored record comes back as it was."],
    problems: ["Deleting permanently cannot be undone."],
  }),
];

/** The guide for a screen: its own slug, or its parent's. */
export function adminGuideSlugFor(keys: (string | undefined)[]): string | null {
  const known = new Set(ADMIN_GUIDES.map((guide) => guide.slug));
  return keys.find((key): key is string => Boolean(key) && known.has(key as string)) ?? null;
}
