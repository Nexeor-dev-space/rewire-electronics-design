import type { UserGuide } from "./types";

/** How to run the shop from the Admin Panel. */
export const ADMIN_GUIDE: UserGuide = {
  title: "Admin Guide",
  description:
    "How to move around the Admin Panel and run the shop day to day: catalogue, orders, marketing and settings.",
  sections: [
    {
      id: "getting-in",
      title: "Getting in",
      steps: [
        "Open /admin on the site and sign in with your staff account.",
        "You land on the Dashboard: orders taken today, the release on sale, warranty claims waiting and stock running short.",
        "If a menu item is missing, your role does not include that area. Ask an admin to change it under Governance, then Roles.",
      ],
    },
    {
      id: "navigate",
      title: "Finding your way around",
      intro: "The left sidebar groups every screen into areas.",
      table: {
        head: ["Area", "Screens"],
        rows: [
          ["Overview", "Dashboard"],
          ["Catalogue", "Products, Categories, Brands, Bulk Product Upload, Add-ons"],
          ["Storefront", "Homepage Builder, Navigation, Content & Policies"],
          ["Sales", "Releases, Orders, Fulfilment"],
          ["Service", "Warranty & Claims, Returns, Support Tickets, Users"],
          ["Marketing", "Campaigns, Marketing Messages, Discount Codes"],
          ["Integrations", "API Keys, Google Merchant, Meta Catalog, Product Feeds"],
          ["Governance", "Reports, Change Log, Delivery Zones, VAT & Configuration, Roles, Trash"],
          ["Help", "Admin Guide, Customer Guide"],
        ],
      },
      notes: [
        "The breadcrumb at the top shows where you are. Click an earlier crumb to go back.",
        "Lists share one pattern: a search box, filters, a table and Previous and Next at the bottom.",
        "Buttons you may not use are hidden or disabled. That is your role, not a fault.",
        "Every change is written to the Change Log with who made it and when.",
      ],
    },
    {
      id: "categories",
      title: "Categories",
      intro: "Set these up first, because every product needs one.",
      steps: [
        "Go to Catalogue, then Categories.",
        "Click Add category.",
        "Fill in the name, slug, type, optional parent, image, description (up to 300 characters) and position.",
        "Tick Show in the storefront menus and home page for a parent category you want in the menus.",
        "Choose a status: Draft, Published or Archived. Only Published categories show to shoppers.",
        "Optional: fill the SEO title and meta description. Blank uses the name and description.",
        "Click Save.",
      ],
      notes: [
        "To change a category, use the row actions to edit it.",
        "A category with products or child categories cannot be deleted. Archive it instead.",
      ],
    },
    {
      id: "brands",
      title: "Brands",
      steps: [
        "Go to Catalogue, then Brands.",
        "Click Add brand, then enter the name and upload the logo.",
        "Save. A brand with products cannot be deleted.",
      ],
    },
    {
      id: "products",
      title: "Products",
      steps: [
        "Go to Catalogue, then Products.",
        "Click Add product.",
        "Fill in the basics: name, slug, SKU, brand, category and description.",
        "Add at least one variant. A variant carries storage, colour, condition, grade, battery health, price and stock. Add variant copies the previous row's condition and grade. Two variants cannot share the same condition, grade, storage and colour.",
        "Upload images. Choose a colour for an image so it shows with that colour, or leave All colours.",
        "Add specifications.",
        "Pick the Add-ons this product offers (up to 4). Leave the price blank to charge the catalogue price, or enter an override.",
        "Fill the SEO fields if needed.",
        "Click Save, then set the status to Published. A product needs at least one image to publish.",
      ],
      notes: [
        "Stock is edited on each variant row of the product form. Saving updates the shop straight away.",
        "Unpublish or Archive hides a product but keeps it. Carts show the line as unavailable.",
        "Delete moves a product to Trash. Restore it from Governance, then Trash, then Products.",
        "Slug and SKU must be unique.",
      ],
    },
    {
      id: "bulk-upload",
      title: "Bulk Product Upload",
      intro: "Use this to add many products at once.",
      steps: [
        "Go to Catalogue, then Bulk Product Upload.",
        "Download the CSV template.",
        "Fill it in, one row per variant, and upload it.",
        "Review the preview and fix any row marked with an error.",
        "Confirm the import.",
        "Open Upload History to see every run and its result.",
      ],
    },
    {
      id: "add-ons",
      title: "Add-ons",
      intro: "Add-ons are optional extras such as cases, chargers and extended cover.",
      steps: [
        "Go to Catalogue, then Add-ons.",
        "Click Add add-on, or use the row actions to edit one.",
        "Enter the Name and a one line Note.",
        "Choose the Kind and enter the Price.",
        "For the Protection kind, enter Extra warranty (months).",
        "Tick Offered to shoppers to switch it on, and Tag as Most chosen if it should carry that badge.",
        "Either tick Offer on every product, or untick it and choose the categories it applies to.",
        "Click Save changes.",
      ],
      notes: [
        "A product with its own add-on picks shows only those. Otherwise it shows add-ons for its category plus the ones offered on every product.",
      ],
    },
    {
      id: "homepage",
      title: "Homepage Builder",
      steps: [
        "Go to Storefront, then Homepage Builder.",
        "Use the arrows or drag to reorder sections, and the eye control to hide one.",
        "Click a section to edit its text, image, button and linked items.",
        "Add banners, brand rows, category rows or deals with Add section.",
        "Click Publish now when you are happy. Until then visitors see the last published version. Use the preview to check first.",
      ],
      notes: ["The FAQ is no longer shown on the homepage. It appears on the About page."],
    },
    {
      id: "navigation",
      title: "Navigation",
      steps: [
        "Go to Storefront, then Navigation.",
        "Edit the About menu, the footer and the mobile bottom bar: groups, links, icons and order.",
        "Publish your changes.",
      ],
    },
    {
      id: "content",
      title: "Content & Policies",
      steps: [
        "Go to Storefront, then Content & Policies.",
        "Pick a page: Warranty, Terms, Shipping, FAQ, Privacy or Returns.",
        "Edit the content with the rich text editor and set the SEO fields.",
        "Publish.",
      ],
      notes: ["FAQ questions are edited here. They show on the About page and on /faq."],
    },
    {
      id: "releases",
      title: "Releases",
      steps: [
        "Go to Sales, then Releases.",
        "Create a release and set its date.",
        "Allocate stock per variant and set any purchase caps.",
        "Set visibility, then publish. Shoppers can join the waitlist before it opens.",
      ],
    },
    {
      id: "orders",
      title: "Orders",
      steps: [
        "Go to Sales, then Orders.",
        "Search by order number, email or last name. Filter by status or payment.",
        "Open an order to see items, history, payment, delivery and customer.",
        "In Status, click the next step button. You can add a note the customer will see. Cancelling asks for confirmation and puts stock back.",
        "In Payment, mark the order paid, unpaid or refunded where allowed. Marking a card order paid also confirms it.",
        "Save the tracking number and any staff note in Delivery.",
        "Click Download invoice for a PDF tax invoice.",
      ],
      notes: [
        "Order flow: Awaiting payment, Confirmed, Processing, Dispatched, Delivered. Cancelled is possible until Dispatched.",
      ],
    },
    {
      id: "fulfilment",
      title: "Fulfilment",
      steps: [
        "Go to Sales, then Fulfilment.",
        "The queue lists Confirmed, Processing and Dispatched orders, oldest first.",
        "Enter the tracking number and the Serial or IMEI for each device, then click Save.",
        "Click Move to the next step. Moving to Delivered starts the warranty for each item.",
      ],
    },
    {
      id: "service",
      title: "Service",
      groups: [
        {
          title: "Warranty & Claims",
          steps: [
            "Look up a device by serial or IMEI.",
            "See its warranty dates and handle the claims raised against it.",
          ],
        },
        {
          title: "Returns",
          steps: [
            "Review the request.",
            "Record the inspection outcome.",
            "Record a refund. The return window length is set in VAT & Configuration.",
          ],
        },
        {
          title: "Support Tickets",
          steps: [
            "Open a ticket and reply.",
            "Change its status, priority or category.",
            "Assign it to a team member.",
          ],
        },
        {
          title: "Users",
          steps: [
            "Staff accounts are under Users, then Staff.",
            "Customer records are under Users, then Customers.",
          ],
        },
      ],
    },
    {
      id: "marketing",
      title: "Marketing",
      groups: [
        {
          title: "Campaigns",
          steps: ["Create a scheduled campaign.", "Choose the product discounts it applies."],
        },
        {
          title: "Discount Codes",
          steps: [
            "Go to Marketing, then Discount Codes, and click add.",
            "Enter the code (3 to 32 letters, numbers, hyphens or underscores). It is stored in capitals.",
            "Choose percent or fixed amount, set start and end dates, a minimum order and usage limits.",
            "Optionally limit it to products or categories.",
            "Save. Customers enter it at checkout.",
          ],
          notes: [
            "A code that has been used on orders cannot be deleted. Switch it off instead.",
          ],
        },
        {
          title: "Marketing Messages",
          steps: ["Templates and sends, kept apart from order emails."],
        },
      ],
    },
    {
      id: "integrations",
      title: "Integrations",
      steps: [
        "API Keys. Enter the Google Analytics, Clarity, Search Console and Meta Pixel IDs, and check the status of email and Stripe.",
        "Google Merchant, Meta Catalog and Product Feeds. Export your catalogue to those platforms.",
      ],
    },
    {
      id: "governance",
      title: "Governance",
      steps: [
        "Reports. Sales, service and inventory reports with filters and CSV export.",
        "Change Log. Who changed what, with the value before and after.",
        "Delivery Zones. Emirates, their areas and delivery rates. Turning an area off removes it from the checkout list.",
        "VAT & Configuration. The VAT rate, return window, low stock threshold, store contact details and invoice details.",
        "Roles. Create custom roles and choose which screens and actions each can use. Assign them under Users, then Staff.",
        "Trash. Restore or permanently delete products and users.",
      ],
    },
    {
      id: "quick",
      title: "Quick answers",
      table: {
        head: ["I want to", "Go to"],
        rows: [
          ["Add a new phone", "Catalogue, Products, Add product"],
          ["Change stock", "Catalogue, Products, edit, variant Stock field"],
          ["Add a case or charger option", "Catalogue, Add-ons"],
          ["Edit FAQ answers", "Storefront, Content & Policies, FAQ"],
          ["Ship an order", "Sales, Fulfilment"],
          ["Refund a customer", "Service, Returns, or Sales, Orders for a cancelled order"],
          ["Create a promo code", "Marketing, Discount Codes"],
          ["Undo a deleted product", "Governance, Trash, Products"],
        ],
      },
    },
  ],
};
