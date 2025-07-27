Smart Expense Tracker
Smart Expense Tracker is an AI-powered, user-friendly web application to track personal expenses, gain insights through machine learning predictions, and visualize spending trends effortlessly. This project provides an intuitive front-end interface combined with real-time charts and financial analytics, built with modern web technologies and popular libraries.

Features
Add, edit, and delete expense entries with description, amount, category, and date.

View quick stats such as total expenses, monthly spending, daily averages, and total entries.

AI-powered predictions including next month’s expense forecasting, spending trends, top spending categories, and weekly averages.

Interactive charts visualizing spending breakdown by category and trends over time using Chart.js.

Filters and search functionality to easily find and analyze expenses.

Persistent data storage using browser localStorage.

Responsive and accessible UI styled with Tailwind CSS.

Demo
You can run the project locally by opening the index.html file in your browser.

No backend required — all logic runs client-side.

Technologies Used
HTML5 – Semantic markup.

CSS3 & Tailwind CSS – Styling and responsive design.

JavaScript (ES6+) – Application logic, event handling, and DOM manipulation.

Chart.js – Charting library to build interactive expense visualizations.

LocalStorage – Browser storage to persist user expense data.

ML/AI Logic – Custom JavaScript implementation simulating basic prediction and trend analysis techniques.

File Structure
text
SmartExpenseTracker/
│
├── index.html          # Main HTML template
├── style.css           # Stylesheet for custom styles and animations
├── app.js              # Main JavaScript logic and ML prediction code
├── README.md           # Project overview and setup instructions (this file)
Usage Instructions
Clone or download this repository.

Open index.html in any modern browser (Chrome, Firefox, Edge, Safari).

Use the form on the left to add new expenses. Fields include description, amount, category, and date.

View summaries in the quick stats panel.

Click Update Predictions to refresh AI-based expense forecasts.

Click Analyze Spending to update charts and visual summaries.

Use the search box and category dropdown to filter expenses.

Clear all data with the Clear All button if needed.

How It Works
Expense Management: Expenses are stored as JSON in browser localStorage ensuring data persists across sessions.

AI Predictions: Simple heuristic-based predictions are computed on expenses data in real-time directly in JavaScript.

Charts: Data visualization uses Chart.js to show category-wise spending and trends over time.

Responsive UI: Tailwind CSS provides a consistent look and feel across various devices.

Potential Improvements / Next Steps
Integrate backend REST API and database for persistent storage beyond browser.

Implement more advanced ML models for predictions using Python/Node.js and TensorFlow or scikit-learn.

Authentication and multi-user support.

Export/import of expenses via CSV or JSON.

Dark mode support and enhanced accessibility features.

Credits & Resources
Tailwind CSS: https://tailwindcss.com/

Chart.js: https://www.chartjs.org/

Icons and emojis sourced from Unicode standard.
