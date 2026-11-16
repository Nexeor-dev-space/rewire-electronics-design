# Admin User Guide

For store administrators and staff. It explains how to move around the Admin Panel and how to run the shop day to day. For how the code works, see [ADMIN-PANEL.md](ADMIN-PANEL.md).

---

## 1. Getting in

1. Open `/admin` on the site and sign in with your staff account.
2. You land on the **Dashboard**: orders taken today, the release on sale, warranty claims waiting and stock running short.
3. If a menu item is missing, your role does not include that area. Ask an admin to change it under **Governance → Roles**.

## 2. Finding your way around

The left sidebar groups every screen into eight areas.

| Area | Screens |
| --- | --- |
| Overview | Dashboard |
| Catalogue | Products, Categories, Brands, Bulk Product Upload, Add-ons |
| Storefront | Homepage Builder, Navigation, Content & Policies |
| Sales | Releases, Orders, Fulfilment |
| Service | Warranty & Claims, Returns, Support Tickets, Users (Staff, Customers) |
| Marketing | Campaigns, Marketing Messages, Discount Codes |
| Integrations | API Keys, Google Merchant, Meta Catalog, Product Feeds |
| Governance | Reports, Change Log, Delivery Zones, VAT & Configuration, Roles, Trash |

Tips:

1. The breadcrumb at the top shows where you are. Click any earlier crumb to go back.
2. Lists share the same pattern: a search box, filters, a table and Previous / Next at the bottom.
3. Buttons you are not allowed to use are hidden or disabled. That is your role, not a fault.
4. Every change is written to the **Change Log** with who made it and when.

---

## 3. Catalogue

### 3.1 Categories

Set these up first, because every product needs one.

1. Go to **Catalogue → Categories**.
2. Click **Add category**.
3. Fill in the name, slug, type, optional parent, image, description (up to 300 characters) and position.
4. Tick **Show in the storefront menus and home page** for a parent category you want in the menus.
5. Choose a status: Draft, Published or Archived. Only Published categories show to shoppers.
6. Optional: fill the SEO title and meta description. Blank uses the name and description.
7. Click **Save**.

To change a category, use the row actions to edit it. A category with products or child categories cannot be deleted. Archive it instead.

### 3.2 Brands

1. Go to **Catalogue → Brands**.
2. Click **Add brand**, then enter the name and upload the logo.
3. Save. Brands with products cannot be deleted.

### 3.3 Products

1. Go to **Catalogue → Products**.
2. Click **Add product**.
3. Fill in the basics: name, slug, SKU, brand, category and description.
4. Add at least one **variant**. A variant carries storage, colour, condition, grade, battery health, price and stock. **Add variant** copies the previous row's condition and grade. Two variants cannot share the same condition, grade, storage and colour.
5. Upload images. Choose a colour for an image so it shows with that colour, or leave **All colours**.
6. Add specifications.
7. Pick the **Add-ons** this product offers (up to 4). Leave the price blank to charge the catalogue price, or enter an override.
8. Fill the SEO fields if needed.
9. Click **Save**, then set the status to **Published**. A product needs at least one image to publish.

Good to know:

1. **Stock** is edited on each variant row of the product form. Saving updates the shop straight away.
2. **Unpublish or Archive** hides a product but keeps it. Carts show the line as unavailable.
3. **Delete** moves a product to Trash. You can restore it from **Governance → Trash → Products**.
4. Slug and SKU must be unique.

### 3.4 Bulk Product Upload

Use this to add many products at once.

1. Go to **Catalogue → Bulk Product Upload**.
2. Download the CSV template.
3. Fill it in, one row per variant, and upload it.
4. Review the preview. Fix any row marked with an error.
5. Confirm the import.
6. Open **Upload History** to see every run and its result.

Full column rules are in [BULK-UPLOAD.md](BULK-UPLOAD.md).

### 3.5 Add-ons

Add-ons are optional extras such as cases, chargers and extended cover.

1. Go to **Catalogue → Add-ons**.
2. Click **Add add-on**, or use the row actions to edit one.
3. Enter the **Name** and a one line **Note**.
4. Choose the **Kind** and enter the **Price**.
5. For the Protection kind, enter **Extra warranty (months)**.
6. Tick **Offered to shoppers** to switch it on, and **Tag as Most chosen** if it should carry that badge.
7. Either tick **Offer on every product**, or untick it and choose the categories it applies to.
8. Click **Save changes**.

A product with its own add-on picks shows only those. Otherwise it shows add-ons for its category plus the ones offered on every product.

---

## 4. Storefront

### 4.1 Homepage Builder

1. Go to **Storefront → Homepage Builder**.
2. Use the arrows or drag to reorder sections, and the eye control to hide one.
3. Click a section to edit its text, image, button and linked items.
4. Add banners, brand rows, category rows or deals with **Add section**.
5. Click **Publish now** when you are happy. Until then visitors see the last published version. Use the preview to check first.

The FAQ is no longer shown on the homepage. It appears on the About page.

### 4.2 Navigation

Under **Storefront → Navigation** you edit the About menu, the footer and the mobile bottom bar: groups, links, icons and order.

### 4.3 Content & Policies

1. Go to **Storefront → Content & Policies**.
2. Pick a page: Warranty, Terms, Shipping, FAQ, Privacy or Returns.
3. Edit the content with the rich text editor and set the SEO fields.
4. Publish.

FAQ questions are edited here. They show on the About page and on `/faq`.

---

## 5. Sales

### 5.1 Releases

1. Go to **Sales → Releases**.
2. Create a release, set its date, and allocate stock per variant with any purchase caps.
3. Set visibility, then publish. Shoppers can join the waitlist before it opens.

### 5.2 Orders

1. Go to **Sales → Orders**.
2. Search by order number, email or last name. Filter by status or payment.
3. Open an order to see items, history, payment, delivery and customer.
4. In **Status**, click the next step button. You can add a note the customer will see. Cancelling asks for confirmation and puts stock back.
5. In **Payment**, mark the order paid, unpaid or refunded where allowed. Marking a card order paid also confirms it.
6. Save the **tracking number** and any staff note in **Delivery**.
7. Click **Download invoice** for a PDF tax invoice.

Order flow: Awaiting payment, Confirmed, Processing, Dispatched, Delivered. Cancelled is possible until Dispatched.

### 5.3 Fulfilment

1. Go to **Sales → Fulfilment**.
2. The queue lists Confirmed, Processing and Dispatched orders, oldest first.
3. Enter the tracking number and the Serial or IMEI for each device. Click **Save**.
4. Click **Move to** the next step. Moving to Delivered starts the warranty for each item.

---

## 6. Service

1. **Warranty & Claims.** Look up a device by serial or IMEI, see its warranty dates and handle claims raised against it.
2. **Returns.** Review requests, record the inspection outcome and record a refund. The return window length is set in VAT & Configuration.
3. **Support Tickets.** Open a ticket, reply, change status, priority or category, and assign it to a team member.
4. **Users.** Staff accounts are under Users → Staff. Customer records are under Users → Customers.

---

## 7. Marketing

1. **Campaigns.** Create a scheduled campaign and the product discounts it applies.
2. **Discount Codes.**
   1. Go to **Marketing → Discount Codes** and click add.
   2. Enter the code (3 to 32 letters, numbers, hyphens or underscores). It is stored in capitals.
   3. Choose percent or fixed amount, set start and end dates, a minimum order, and usage limits.
   4. Optionally limit it to products or categories.
   5. Save. Customers enter it at checkout. A code that has been used on orders cannot be deleted. Switch it off instead.
3. **Marketing Messages.** Templates and sends, kept apart from order emails.

---

## 8. Integrations

1. **API Keys.** Enter the Google Analytics, Clarity, Search Console and Meta Pixel IDs, and check the status of email and Stripe.
2. **Google Merchant, Meta Catalog and Product Feeds.** Export your catalogue to those platforms.

---

## 9. Governance

1. **Reports.** Sales, service and inventory reports with filters and CSV export.
2. **Change Log.** Who changed what, with the value before and after.
3. **Delivery Zones.** Emirates, their areas and delivery rates. Turning an area off removes it from the checkout list.
4. **VAT & Configuration.** The VAT rate, return window, low stock threshold, store contact details and invoice details.
5. **Roles.** Create custom roles and choose which screens and actions each can use. Assign them under Users → Staff.
6. **Trash.** Restore or permanently delete products and users.

---

## 10. Quick answers

| I want to | Go to |
| --- | --- |
| Add a new phone | Catalogue → Products → Add product |
| Change stock | Catalogue → Products → edit → variant Stock field |
| Add a case or charger option | Catalogue → Add-ons |
| Edit FAQ answers | Storefront → Content & Policies → FAQ |
| Ship an order | Sales → Fulfilment |
| Refund a customer | Service → Returns, or Sales → Orders for a cancelled order |
| Create a promo code | Marketing → Discount Codes |
| Undo a deleted product | Governance → Trash → Products |
