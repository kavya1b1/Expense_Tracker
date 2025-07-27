 // Global variables
 let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
 let categoryChart, trendChart;
 
 // DOM elements
 const form = document.getElementById("expense-form");
 const tableBody = document.getElementById("expense-table-body");
 const predictBtn = document.getElementById("predict-btn");
 const analyzeBtn = document.getElementById("analyze-btn");
 const searchFilter = document.getElementById("search-filter");
 const categoryFilter = document.getElementById("category-filter");
 const clearAllBtn = document.getElementById("clear-all");
 
 // Set today's date as default
 document.getElementById('date').valueAsDate = new Date();
 
 // Event listeners
 form.addEventListener("submit", addExpense);
 predictBtn.addEventListener("click", updatePredictions);
 analyzeBtn.addEventListener("click", analyzeSpending);
 searchFilter.addEventListener("input", filterExpenses);
 categoryFilter.addEventListener("change", filterExpenses);
 clearAllBtn.addEventListener("click", clearAllExpenses);
 
 // Machine Learning Class
 class ExpensePredictor {
   constructor(expenses) {
     this.expenses = expenses;
     this.processedData = this.preprocessData();
   }
   
   preprocessData() {
     const data = this.expenses.map(expense => ({
       ...expense,
       date: new Date(expense.date),
       dayOfWeek: new Date(expense.date).getDay(),
       dayOfMonth: new Date(expense.date).getDate(),
       month: new Date(expense.date).getMonth(),
       isWeekend: new Date(expense.date).getDay() === 0 || new Date(expense.date).getDay() === 6
     }));
     
     return data.sort((a, b) => a.date - b.date);
   }
   
   // Linear regression for trend analysis
   linearRegression(x, y) {
     const n = x.length;
     const sumX = x.reduce((a, b) => a + b, 0);
     const sumY = y.reduce((a, b) => a + b, 0);
     const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
     const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
     
     const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
     const intercept = (sumY - slope * sumX) / n;
     
     return { slope, intercept };
   }
   
   // Exponential smoothing for prediction
   exponentialSmoothing(data, alpha = 0.3) {
     if (data.length === 0) return [];
     
     const smoothed = [data[0]];
     for (let i = 1; i < data.length; i++) {
       smoothed[i] = alpha * data[i] + (1 - alpha) * smoothed[i - 1];
     }
     return smoothed;
   }
   
   // Seasonal decomposition
   getSeasonalPattern() {
     const monthlyData = {};
     const weeklyData = {};
     
     this.processedData.forEach(expense => {
       const month = expense.month;
       const dayOfWeek = expense.dayOfWeek;
       
       if (!monthlyData[month]) monthlyData[month] = [];
       if (!weeklyData[dayOfWeek]) weeklyData[dayOfWeek] = [];
       
       monthlyData[month].push(expense.amount);
       weeklyData[dayOfWeek].push(expense.amount);
     });
     
     const monthlyAvg = {};
     const weeklyAvg = {};
     
     Object.keys(monthlyData).forEach(month => {
       monthlyAvg[month] = monthlyData[month].reduce((a, b) => a + b, 0) / monthlyData[month].length;
     });
     
     Object.keys(weeklyData).forEach(day => {
       weeklyAvg[day] = weeklyData[day].reduce((a, b) => a + b, 0) / weeklyData[day].length;
     });
     
     return { monthlyAvg, weeklyAvg };
   }
   
   // Category-based prediction
   getCategoryPrediction() {
     const categoryData = {};
     
     this.expenses.forEach(expense => {
       if (!categoryData[expense.category]) {
         categoryData[expense.category] = [];
       }
       categoryData[expense.category].push(expense.amount);
     });
     
     const categoryPredictions = {};
     Object.keys(categoryData).forEach(category => {
       const amounts = categoryData[category];
       const smoothed = this.exponentialSmoothing(amounts);
       const lastValue = smoothed[smoothed.length - 1];
       const trend = amounts.length > 1 ? 
         (amounts[amounts.length - 1] - amounts[0]) / amounts.length : 0;
       
       categoryPredictions[category] = {
         predicted: lastValue + trend,
         confidence: Math.min(95, 60 + (amounts.length * 2))
       };
     });
     
     return categoryPredictions;
   }
   
   // Main prediction function
   predictNextMonth() {
     if (this.expenses.length < 2) {
       return {
         amount: 0,
         confidence: 0,
         method: "insufficient_data"
       };
     }
     
     // Get daily spending data
     const dailySpending = this.getDailySpending();
     const amounts = dailySpending.map(d => d.amount);
     
     // Apply exponential smoothing
     const smoothed = this.exponentialSmoothing(amounts);
     
     // Get trend using linear regression
     const x = amounts.map((_, i) => i);
     const { slope, intercept } = this.linearRegression(x, smoothed);
     
     // Get seasonal patterns
     const { monthlyAvg, weeklyAvg } = this.getSeasonalPattern();
     
     // Predict next month (30 days)
     const nextMonthStart = amounts.length;
     const nextMonthEnd = nextMonthStart + 30;
     
     let totalPrediction = 0;
     for (let i = nextMonthStart; i < nextMonthEnd; i++) {
       const trendValue = slope * i + intercept;
       const seasonalAdjustment = this.getSeasonalAdjustment(i, monthlyAvg, weeklyAvg);
       totalPrediction += Math.max(0, trendValue * seasonalAdjustment);
     }
     
     // Calculate confidence based on data quality
     const confidence = Math.min(95, 40 + (this.expenses.length * 1.5));
     
     return {
       amount: totalPrediction,
       confidence: confidence,
       method: "exponential_smoothing_with_trend",
       trend: slope > 0 ? "increasing" : slope < 0 ? "decreasing" : "stable"
     };
   }
   
   getDailySpending() {
     const dailyData = {};
     
     this.processedData.forEach(expense => {
       const dateStr = expense.date.toDateString();
       if (!dailyData[dateStr]) {
         dailyData[dateStr] = { date: expense.date, amount: 0 };
       }
       dailyData[dateStr].amount += expense.amount;
     });
     
     return Object.values(dailyData).sort((a, b) => a.date - b.date);
   }
   
   getSeasonalAdjustment(dayIndex, monthlyAvg, weeklyAvg) {
     const currentMonth = new Date().getMonth();
     const dayOfWeek = dayIndex % 7;
     
     const monthlyFactor = monthlyAvg[currentMonth] || 1;
     const weeklyFactor = weeklyAvg[dayOfWeek] || 1;
     const overallAvg = this.expenses.reduce((sum, e) => sum + e.amount, 0) / this.expenses.length;
     
     return ((monthlyFactor + weeklyFactor) / 2) / overallAvg;
   }
   
   getSpendingTrend() {
     if (this.expenses.length < 5) return { trend: "stable", description: "Need more data" };
     
     const recent = this.expenses.slice(-7);
     const older = this.expenses.slice(-14, -7);
     
     const recentAvg = recent.reduce((sum, e) => sum + e.amount, 0) / recent.length;
     const olderAvg = older.reduce((sum, e) => sum + e.amount, 0) / older.length;
     
     const change = ((recentAvg - olderAvg) / olderAvg) * 100;
     
     if (change > 15) return { trend: "📈 Increasing", description: `+${change.toFixed(1)}% vs last week` };
     if (change < -15) return { trend: "📉 Decreasing", description: `${change.toFixed(1)}% vs last week` };
     return { trend: "📊 Stable", description: `${change.toFixed(1)}% vs last week` };
   }
 }
 
 // Add expense function
 function addExpense(e) {
   e.preventDefault();
   const desc = document.getElementById("description").value;
   const amount = parseFloat(document.getElementById("amount").value);
   const category = document.getElementById("category").value;
   const date = document.getElementById("date").value || new Date().toISOString().split('T')[0];
   
   const expense = {
     id: Date.now(),
     desc,
     amount,
     category,
     date,
     timestamp: new Date().toISOString()
   };
   
   expenses.unshift(expense);
   saveExpenses();
   renderTable();
   updateStats();
   updatePredictions();
   updateCharts();
   form.reset();
   document.getElementById('date').valueAsDate = new Date();
 }
 
 // Save to localStorage
 function saveExpenses() {
   localStorage.setItem('expenses', JSON.stringify(expenses));
 }
 
 // Render table
 function renderTable(filteredExpenses = null) {
   const expensesToShow = filteredExpenses || expenses;
   tableBody.innerHTML = "";
   
   expensesToShow.forEach((exp, index) => {
     const row = document.createElement('tr');
     row.className = 'border-b border-gray-100 hover:bg-gray-50 expense-item';
     row.innerHTML = `
       <td class="py-3 px-2 text-sm">${new Date(exp.date).toLocaleDateString()}</td>
       <td class="py-3 px-2 text-sm">${exp.desc}</td>
       <td class="py-3 px-2 text-sm font-semibold text-red-600">₹${exp.amount.toFixed(2)}</td>
       <td class="py-3 px-2 text-sm">
         <span class="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
           ${exp.category}
         </span>
       </td>
       <td class="py-3 px-2 text-sm">
         <button onclick="deleteExpense(${exp.id})" class="text-red-500 hover:text-red-700 text-xs">
           Delete
         </button>
       </td>
     `;
     tableBody.appendChild(row);
   });
 }
 
 // Delete expense
 function deleteExpense(id) {
   expenses = expenses.filter(exp => exp.id !== id);
   saveExpenses();
   renderTable();
   updateStats();
   updatePredictions();
   updateCharts();
 }
 
 // Update statistics
 function updateStats() {
   const total = expenses.reduce((sum, e) => sum + e.amount, 0);
   const thisMonth = expenses.filter(e => {
     const expDate = new Date(e.date);
     const now = new Date();
     return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
   }).reduce((sum, e) => sum + e.amount, 0);
   
   const daysWithExpenses = new Set(expenses.map(e => e.date)).size;
   const avgDaily = daysWithExpenses > 0 ? total / daysWithExpenses : 0;
   
   document.getElementById('total-expenses').textContent = `₹${total.toFixed(2)}`;
   document.getElementById('month-expenses').textContent = `₹${thisMonth.toFixed(2)}`;
   document.getElementById('avg-daily').textContent = `₹${avgDaily.toFixed(2)}`;
   document.getElementById('total-entries').textContent = expenses.length;
 }
 
 // Update predictions
 function updatePredictions() {
   const predictor = new ExpensePredictor(expenses);
   const prediction = predictor.predictNextMonth();
   const trend = predictor.getSpendingTrend();
   
   document.getElementById('next-month-prediction').textContent = `₹${prediction.amount.toFixed(2)}`;
   document.getElementById('prediction-confidence').textContent = `${prediction.confidence.toFixed(0)}% confidence`;
   document.getElementById('spending-trend').textContent = trend.trend;
   document.getElementById('trend-description').textContent = trend.description;
   
   // Update top category
   const categories = {};
   expenses.forEach(e => {
     categories[e.category] = (categories[e.category] || 0) + e.amount;
   });
   
   const topCategory = Object.keys(categories).reduce((a, b) => 
     categories[a] > categories[b] ? a : b, Object.keys(categories)[0] || 'None');
   
   if (topCategory && topCategory !== 'None') {
     const total = expenses.reduce((sum, e) => sum + e.amount, 0);
     const percentage = ((categories[topCategory] / total) * 100).toFixed(1);
     document.getElementById('top-category').textContent = topCategory;
     document.getElementById('category-percentage').textContent = `${percentage}% of total`;
   }
   
   // Update weekly average
   const weeklyExpenses = expenses.filter(e => {
     const expDate = new Date(e.date);
     const weekAgo = new Date();
     weekAgo.setDate(weekAgo.getDate() - 7);
     return expDate >= weekAgo;
   });
   
   const weeklyAvg = weeklyExpenses.reduce((sum, e) => sum + e.amount, 0);
   document.getElementById('weekly-avg').textContent = `₹${weeklyAvg.toFixed(2)}`;
   
   // Animate prediction update
   document.getElementById('next-month-prediction').classList.add('pulse-animation');
   setTimeout(() => {
     document.getElementById('next-month-prediction').classList.remove('pulse-animation');
   }, 2000);
 }
 
 // Update charts
 function updateCharts() {
   updateCategoryChart();
   updateTrendChart();
 }
 
 // Category chart
 function updateCategoryChart() {
   const ctx = document.getElementById('categoryChart').getContext('2d');
   
   if (categoryChart) {
     categoryChart.destroy();
   }
   
   const categories = {};
   expenses.forEach(e => {
     categories[e.category] = (categories[e.category] || 0) + e.amount;
   });
   
   const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'];
   
   categoryChart = new Chart(ctx, {
     type: 'doughnut',
     data: {
       labels: Object.keys(categories),
       datasets: [{
         data: Object.values(categories),
         backgroundColor: colors.slice(0, Object.keys(categories).length),
         borderWidth: 2,
         borderColor: '#fff'
       }]
     },
     options: {
       responsive: true,
       maintainAspectRatio: false,
       plugins: {
         legend: {
           position: 'bottom',
           labels: {
             font: { size: 10 }
           }
         },
         title: {
           display: true,
           text: 'Spending by Category'
         }
       }
     }
   });
 }
 
 // Trend chart
 function updateTrendChart() {
   const ctx = document.getElementById('trendChart').getContext('2d');
   
   if (trendChart) {
     trendChart.destroy();
   }
   
   const last30Days = [];
   const today = new Date();
   
   for (let i = 29; i >= 0; i--) {
     const date = new Date(today);
     date.setDate(date.getDate() - i);
     const dateStr = date.toDateString();
     
     const dayExpenses = expenses.filter(e => 
       new Date(e.date).toDateString() === dateStr
     ).reduce((sum, e) => sum + e.amount, 0);
     
     last30Days.push({
       date: date.toLocaleDateString(),
       amount: dayExpenses
     });
   }
   
   trendChart = new Chart(ctx, {
     type: 'line',
     data: {
       labels: last30Days.map(d => d.date),
       datasets: [{
         label: 'Daily Spending',
         data: last30Days.map(d => d.amount),
         borderColor: '#667eea',
         backgroundColor: 'rgba(102, 126, 234, 0.1)',
         fill: true,
         tension: 0.4
       }]
     },
     options: {
       responsive: true,
       maintainAspectRatio: false,
       plugins: {
         legend: {
           display: false
         },
         title: {
           display: true,
           text: 'Daily Spending Trend (Last 30 Days)'
         }
       },
       scales: {
         y: {
           beginAtZero: true,
           ticks: {
             callback: function(value) {
               return '₹' + value.toFixed(0);
             }
           }
         },
         x: {
           display: false
         }
       }
     }
   });
 }
 
 // Filter expenses
 function filterExpenses() {
   const searchTerm = searchFilter.value.toLowerCase();
   const categoryTerm = categoryFilter.value;
   
   const filtered = expenses.filter(expense => {
     const matchesSearch = expense.desc.toLowerCase().includes(searchTerm) ||
                         expense.amount.toString().includes(searchTerm);
     const matchesCategory = !categoryTerm || expense.category === categoryTerm;
     
     return matchesSearch && matchesCategory;
   });
   
   renderTable(filtered);
 }
 
 // Clear all expenses
 function clearAllExpenses() {
   if (confirm('Are you sure you want to clear all expenses? This action cannot be undone.')) {
     expenses = [];
     saveExpenses();
     renderTable();
     updateStats();
     updatePredictions();
     updateCharts();
   }
 }
 
 // Analyze spending patterns
 function analyzeSpending() {
   const predictor = new ExpensePredictor(expenses);
   const analysis = predictor.performDetailedAnalysis();
   
   // Show analysis modal or update UI with insights
   showAnalysisModal(analysis);
 }
 
 // Show detailed analysis
 function showAnalysisModal(analysis) {
   const modal = document.createElement('div');
   modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
   modal.innerHTML = `
     <div class="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
       <h3 class="text-xl font-bold mb-4">📊 Spending Analysis</h3>
       <div class="space-y-4">
         <div class="bg-blue-50 p-4 rounded-lg">
           <h4 class="font-semibold text-blue-800">Spending Insights</h4>
           <ul class="text-sm text-blue-700 mt-2 space-y-1">
             ${analysis.insights.map(insight => `<li>• ${insight}</li>`).join('')}
           </ul>
         </div>
         <div class="bg-green-50 p-4 rounded-lg">
           <h4 class="font-semibold text-green-800">Recommendations</h4>
           <ul class="text-sm text-green-700 mt-2 space-y-1">
             ${analysis.recommendations.map(rec => `<li>• ${rec}</li>`).join('')}
           </ul>
         </div>
       </div>
       <button onclick="this.parentElement.parentElement.remove()" 
               class="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
         Close
       </button>
     </div>
   `;
   document.body.appendChild(modal);
   
   // Close modal when clicking outside
   modal.addEventListener('click', (e) => {
     if (e.target === modal) {
       modal.remove();
     }
   });
 }
 
 // Export data
 function exportData() {
   const dataStr = JSON.stringify(expenses, null, 2);
   const dataBlob = new Blob([dataStr], {type: 'application/json'});
   const url = URL.createObjectURL(dataBlob);
   const link = document.createElement('a');
   link.href = url;
   link.download = 'expenses.json';
   link.click();
   URL.revokeObjectURL(url);
 }
 
 // Import data
 function importData() {
   const input = document.createElement('input');
   input.type = 'file';
   input.accept = '.json';
   input.onchange = (e) => {
     const file = e.target.files[0];
     if (file) {
       const reader = new FileReader();
       reader.onload = (e) => {
         try {
           const importedExpenses = JSON.parse(e.target.result);
           expenses = [...expenses, ...importedExpenses];
           saveExpenses();
           renderTable();
           updateStats();
           updatePredictions();
           updateCharts();
           alert('Data imported successfully!');
         } catch (error) {
           alert('Error importing data. Please check the file format.');
         }
       };
       reader.readAsText(file);
     }
   };
   input.click();
 }
 
 // Enhanced ExpensePredictor with detailed analysis
 ExpensePredictor.prototype.performDetailedAnalysis = function() {
   const insights = [];
   const recommendations = [];
   
   // Analyze spending patterns
   const totalSpending = this.expenses.reduce((sum, e) => sum + e.amount, 0);
   const avgDaily = totalSpending / Math.max(1, this.expenses.length);
   
   // Category analysis
   const categories = {};
   this.expenses.forEach(e => {
     categories[e.category] = (categories[e.category] || 0) + e.amount;
   });
   
   const topCategory = Object.keys(categories).reduce((a, b) => 
     categories[a] > categories[b] ? a : b, Object.keys(categories)[0]);
   
   if (topCategory) {
     const topCategoryAmount = categories[topCategory];
     const percentage = ((topCategoryAmount / totalSpending) * 100).toFixed(1);
     insights.push(`Your highest spending category is ${topCategory} (${percentage}% of total)`);
     
     if (percentage > 40) {
       recommendations.push(`Consider reducing ${topCategory} expenses as they make up ${percentage}% of your spending`);
     }
   }
   
   // Spending frequency analysis
   const daysWithExpenses = new Set(this.expenses.map(e => e.date)).size;
   const spendingFrequency = (daysWithExpenses / 30 * 100).toFixed(1);
   insights.push(`You spend money on ${spendingFrequency}% of days`);
   
   // Weekend vs weekday analysis
   const weekendExpenses = this.expenses.filter(e => {
     const day = new Date(e.date).getDay();
     return day === 0 || day === 6;
   });
   
   const weekdayExpenses = this.expenses.filter(e => {
     const day = new Date(e.date).getDay();
     return day !== 0 && day !== 6;
   });
   
   if (weekendExpenses.length > 0 && weekdayExpenses.length > 0) {
     const weekendAvg = weekendExpenses.reduce((sum, e) => sum + e.amount, 0) / weekendExpenses.length;
     const weekdayAvg = weekdayExpenses.reduce((sum, e) => sum + e.amount, 0) / weekdayExpenses.length;
     
     if (weekendAvg > weekdayAvg * 1.2) {
       insights.push(`Weekend spending is ${((weekendAvg / weekdayAvg - 1) * 100).toFixed(1)}% higher than weekdays`);
       recommendations.push('Try to plan weekend activities with a budget to control spending');
     }
   }
   
   // Monthly trend analysis
   const monthlyData = {};
   this.expenses.forEach(e => {
     const month = new Date(e.date).getMonth();
     if (!monthlyData[month]) monthlyData[month] = 0;
     monthlyData[month] += e.amount;
   });
   
   const months = Object.keys(monthlyData).map(Number).sort((a, b) => a - b);
   if (months.length > 1) {
     const recentMonth = monthlyData[months[months.length - 1]];
     const previousMonth = monthlyData[months[months.length - 2]];
     const change = ((recentMonth - previousMonth) / previousMonth * 100).toFixed(1);
     
     if (Math.abs(change) > 10) {
       insights.push(`Monthly spending ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}%`);
       
       if (change > 20) {
         recommendations.push('Review recent spending increases and identify areas to cut back');
       }
     }
   }
   
   // Average transaction analysis
   if (avgDaily > 500) {
     recommendations.push('Consider setting daily spending limits to control expenses');
   }
   
   if (Object.keys(categories).length > 6) {
     recommendations.push('Try to focus spending on fewer categories for better budget control');
   }
   
   // Savings recommendations
   const highestExpenses = this.expenses.sort((a, b) => b.amount - a.amount).slice(0, 5);
   if (highestExpenses.length > 0) {
     const highestAmount = highestExpenses[0].amount;
     if (highestAmount > avgDaily * 5) {
       recommendations.push(`Review high-value purchases like "${highestExpenses[0].desc}" (₹${highestAmount.toFixed(2)})`);
     }
   }
   
   return { insights, recommendations };
 };
 
 // Add budget tracking
 let monthlyBudget = parseFloat(localStorage.getItem('monthlyBudget')) || 0;
 
 function setBudget() {
   const budget = prompt('Enter your monthly budget (₹):');
   if (budget && !isNaN(budget)) {
     monthlyBudget = parseFloat(budget);
     localStorage.setItem('monthlyBudget', monthlyBudget);
     updateBudgetDisplay();
   }
 }
 
 function updateBudgetDisplay() {
   const thisMonth = expenses.filter(e => {
     const expDate = new Date(e.date);
     const now = new Date();
     return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
   }).reduce((sum, e) => sum + e.amount, 0);
   
   if (monthlyBudget > 0) {
     const percentage = (thisMonth / monthlyBudget * 100).toFixed(1);
     const remaining = monthlyBudget - thisMonth;
     
     // Add budget indicator to the UI
     let budgetIndicator = document.getElementById('budget-indicator');
     if (!budgetIndicator) {
       budgetIndicator = document.createElement('div');
       budgetIndicator.id = 'budget-indicator';
       budgetIndicator.className = 'mt-4 p-3 rounded-lg';
       document.querySelector('.bg-white.rounded-xl.shadow-lg.p-6.card-hover.mt-6').appendChild(budgetIndicator);
     }
     
     const color = percentage > 90 ? 'red' : percentage > 70 ? 'yellow' : 'green';
     budgetIndicator.className = `mt-4 p-3 rounded-lg bg-${color}-100 border border-${color}-200`;
     budgetIndicator.innerHTML = `
       <div class="flex justify-between items-center">
         <span class="text-${color}-800 font-semibold">Monthly Budget</span>
         <button onclick="setBudget()" class="text-${color}-600 hover:text-${color}-800 text-sm">Edit</button>
       </div>
       <div class="mt-2">
         <div class="flex justify-between text-sm text-${color}-700">
           <span>Spent: ₹${thisMonth.toFixed(2)}</span>
           <span>Remaining: ₹${remaining.toFixed(2)}</span>
         </div>
         <div class="w-full bg-${color}-200 rounded-full h-2 mt-1">
           <div class="bg-${color}-500 h-2 rounded-full transition-all duration-300" style="width: ${Math.min(100, percentage)}%"></div>
         </div>
         <div class="text-xs text-${color}-600 mt-1">${percentage}% of budget used</div>
       </div>
     `;
   }
 }
 
 // Initialize app
 function init() {
   renderTable();
   updateStats();
   updatePredictions();
   updateCharts();
   updateBudgetDisplay();
   
   // Add export/import buttons
   const buttonContainer = document.createElement('div');
   buttonContainer.className = 'flex space-x-2 mt-4';
   buttonContainer.innerHTML = `
     <button onclick="exportData()" class="bg-gray-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-gray-600 transition-colors">
       📤 Export
     </button>
     <button onclick="importData()" class="bg-gray-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-gray-600 transition-colors">
       📥 Import
     </button>
     <button onclick="setBudget()" class="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600 transition-colors">
       💰 Set Budget
     </button>
   `;
   document.querySelector('.bg-white.rounded-xl.shadow-lg.p-6.card-hover.mt-6').appendChild(buttonContainer);
 }
 
 // Run initialization when page loads
 document.addEventListener('DOMContentLoaded', init);
 
 // Auto-save and periodic updates
 setInterval(() => {
   updateStats();
   updatePredictions();
 }, 30000); // Update every 30 seconds
 
 // Add keyboard shortcuts
 document.addEventListener('keydown', (e) => {
   if (e.ctrlKey || e.metaKey) {
     switch(e.key) {
       case 'n':
         e.preventDefault();
         document.getElementById('description').focus();
         break;
       case 'e':
         e.preventDefault();
         exportData();
         break;
       case 'i':
         e.preventDefault();
         importData();
         break;
     }
   }
 });
 
 // Add notification system
 function showNotification(message, type = 'info') {
   const notification = document.createElement('div');
   notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
     type === 'success' ? 'bg-green-500 text-white' :
     type === 'error' ? 'bg-red-500 text-white' :
     'bg-blue-500 text-white'
   }`;
   notification.textContent = message;
   
   document.body.appendChild(notification);
   
   setTimeout(() => {
     notification.remove();
   }, 3000);
 }
 
 // Enhanced form validation
 form.addEventListener('submit', (e) => {
   const amount = parseFloat(document.getElementById('amount').value);
   const desc = document.getElementById('description').value.trim();
   
   if (amount <= 0) {
     e.preventDefault();
     showNotification('Amount must be greater than 0', 'error');
     return;
   }
   
   if (desc.length < 2) {
     e.preventDefault();
     showNotification('Description must be at least 2 characters', 'error');
     return;
   }
   
   if (amount > 50000) {
     if (!confirm('This is a large expense (>₹50,000). Are you sure?')) {
       e.preventDefault();
       return;
     }
   }
 });
 
 // Add expense categories with emojis for better UX
 const categoryEmojis = {
   'Food': '🍕',
   'Travel': '✈️',
   'Shopping': '🛍️',
   'Entertainment': '🎬',
   'Healthcare': '🏥',
   'Education': '📚',
   'Bills': '💡',
   'Other': '📦'
 };
 
 window.deleteExpense = deleteExpense;
 window.setBudget = setBudget;
 window.exportData = exportData;
 window.importData = importData;