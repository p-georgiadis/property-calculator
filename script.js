// Import Firebase SDK and Firestore modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.14.0/firebase-firestore.js";

let db;
let tables = [];
let currentTable = null;

// Load Firebase configuration dynamically from config.json
async function loadFirebaseConfig() {
    try {
        // Use './config.json' if you are running the code from the same directory on GitHub Pages.
        const response = await fetch('./config.json');
        const firebaseConfig = await response.json();
        initializeFirebaseApp(firebaseConfig); // Initialize Firebase with the fetched config
    } catch (error) {
        console.error('Failed to load Firebase config:', error);
        document.body.innerHTML += `<div style="color: red;">Failed to load Firebase configuration. Please check your setup.</div>`;
    }
}


function initializeFirebaseApp(config) {
    console.log("Initializing Firebase with config:", config); // Debug Log
    const app = initializeApp(config);
    db = getFirestore(app);

    if (!db) {
        console.error("Firestore instance not created. Check Firebase configuration.");
    } else {
        console.log("Firestore instance created successfully:", db); // Debug Log
    }

    setupEventListeners();
    loadTables(); // Load tables from Firestore after initialization
}

// Set up event listeners for UI elements
function setupEventListeners() {
    document.getElementById('addDeduction').addEventListener('click', addDeductionField);
    document.getElementById('calculateProfit').addEventListener('click', calculateProfit);
    document.getElementById('saveTables').addEventListener('click', saveCurrentTable);
    document.getElementById('loadTables').addEventListener('click', loadTables);
}

// Function to dynamically add a deduction field
function addDeductionField() {
    const deductionFields = document.getElementById('deductionFields');
    const newRow = document.createElement('div');
    newRow.className = 'deduction-row';
    newRow.innerHTML = `
        <input type="text" class="deductionName" placeholder="Deduction Name">
        <input type="number" class="deductionAmount" placeholder="Deduction Amount">
    `;
    deductionFields.appendChild(newRow);
}

// Function to calculate profit based on inputs and deductions
function calculateProfit() {
    const title = document.getElementById('tableTitle').value;
    const salePrice = parseFloat(document.getElementById('salePrice').value);
    const cashDown = parseFloat(document.getElementById('cashDown').value);
    const saleType = document.getElementById('saleType').value;

    if (title && !isNaN(salePrice) && !isNaN(cashDown)) {
        currentTable = {
            title: title,
            saleType: saleType,
            salePrice: salePrice,
            cashDown: cashDown,
            deductions: [],
            netProfit: 0
        };

        const deductionRows = document.querySelectorAll('.deduction-row');
        deductionRows.forEach(row => {
            const name = row.querySelector('.deductionName').value;
            const amount = parseFloat(row.querySelector('.deductionAmount').value);
            if (name && !isNaN(amount)) {
                currentTable.deductions.push({ name, amount });
            }
        });

        const totalDeductions = currentTable.deductions.reduce((sum, deduction) => sum + deduction.amount, 0);
        currentTable.netProfit = salePrice - totalDeductions;

        updateCurrentTable();
    }
}

// Function to get display name for sale type
function getSaleTypeDisplay(saleType) {
    switch (saleType) {
        case 'buildingOnly':
            return 'Building Only';
        case 'buildingAndRestaurant':
            return 'Building + Occupied Restaurant';
        default:
            return saleType || 'N/A';
    }
}

// Function to update the displayed current table with calculated profit and deductions
function updateCurrentTable() {
    const tableDiv = document.getElementById('currentTable');
    tableDiv.innerHTML = '';

    if (currentTable) {
        const tableHtml = `
            <div class="calculator">
                <h2>${currentTable.title}: ${getSaleTypeDisplay(currentTable.saleType)}</h2>
                <table>
                    <tr><th>Item</th><th>Amount</th></tr>
                    <tr><td>Sale Price</td><td>$${currentTable.salePrice.toFixed(2)}</td></tr>
                    <tr><td>Cash Down</td><td>$${currentTable.cashDown.toFixed(2)}</td></tr>
                    ${currentTable.deductions.map(d => `<tr><td>${d.name}</td><td>$${d.amount.toFixed(2)}</td></tr>`).join('')}
                    <tr><td><strong>Net Profit</strong></td><td><strong>$${currentTable.netProfit.toFixed(2)}</strong></td></tr>
                </table>
                <div class="results">
                    <p>Partner 1 Share: $${(currentTable.netProfit / 2).toFixed(2)}</p>
                    <p>Partner 2 Share: $${(currentTable.netProfit / 2).toFixed(2)}</p>
                </div>
            </div>
        `;
        tableDiv.innerHTML = tableHtml;
    }
}

// Save the current table to Firestore
async function saveCurrentTable() {
    if (currentTable) {
        tables.push(currentTable);
        try {
            await setDoc(doc(db, "mezeTables", "salesData"), { tables: tables });
            alert("Table saved successfully!");
            clearInputFields();
            currentTable = null;
            updateCurrentTable(); // This will clear the current table display
            loadTables(); // This will reload and display all saved tables
        } catch (error) {
            console.error("Error saving table: ", error);
            alert("Error saving table. Please try again.");
        }
    } else {
        alert("Please calculate profit before saving the table.");
    }
}

// Function to clear input fields after saving or canceling
function clearInputFields() {
    document.getElementById('tableTitle').value = '';
    document.getElementById('salePrice').value = '';
    document.getElementById('cashDown').value = '';
    document.getElementById('deductionFields').innerHTML = `
        <div class="deduction-row">
            <input type="text" class="deductionName" placeholder="Deduction Name">
            <input type="number" class="deductionAmount" placeholder="Deduction Amount">
        </div>
    `;
}

// Load tables from Firestore and update the display
async function loadTables() {
    try {
        console.log("Attempting to load tables from Firestore...");
        const docRef = doc(db, "mezeTables", "salesData");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Document data:", data);

            tables = Array.isArray(data.tables) ? data.tables : [];
            console.log("Tables data:", tables);

            updateSavedTables();
            alert("Tables loaded successfully!");
        } else {
            console.log("No tables found in the database.");
            alert("No tables found in the database.");
            tables = [];
        }
    } catch (error) {
        console.error("Error loading tables: ", error);
        alert("Error loading tables. Please try again.");
    }
}

// Function to delete a table entry and update Firestore
async function deleteTable(index) {
    tables.splice(index, 1);
    try {
        await setDoc(doc(db, "mezeTables", "salesData"), { tables: tables });
        alert("Table deleted successfully!");
        loadTables(); // Reload tables from the database
    } catch (error) {
        console.error("Error deleting table: ", error);
        alert("Error deleting table. Please try again.");
    }
}

// Confirm before deleting a table entry
function confirmDelete(index) {
    if (confirm("Are you sure you want to delete this table from the database?")) {
        deleteTable(index);
    }
}

// Function to update the display of saved tables
function updateSavedTables() {
    const savedTablesDiv = document.getElementById('savedTables');
    savedTablesDiv.innerHTML = '';

    tables.forEach((table, index) => {
        const salePrice = typeof table.salePrice === 'number' ? table.salePrice.toFixed(2) : 'N/A';
        const cashDown = typeof table.cashDown === 'number' ? table.cashDown.toFixed(2) : 'N/A';
        const netProfit = typeof table.netProfit === 'number' ? table.netProfit.toFixed(2) : 'N/A';

        const tableHtml = `
            <div class="calculator saved-table">
                <div class="delete-button" onclick="confirmDelete(${index})">×</div>
                <h2>${table.title || 'Untitled'}: ${getSaleTypeDisplay(table.saleType)}</h2>
                <table>
                    <tr><th>Item</th><th>Amount</th></tr>
                    <tr><td>Sale Price</td><td>$${salePrice}</td></tr>
                    <tr><td>Cash Down</td><td>$${cashDown}</td></tr>
                    ${Array.isArray(table.deductions) ? table.deductions.map(d => `
                        <tr>
                            <td>${d.name || 'Unnamed Deduction'}</td>
                            <td>$${typeof d.amount === 'number' ? d.amount.toFixed(2) : 'N/A'}</td>
                        </tr>
                    `).join('') : ''}
                    <tr><td><strong>Net Profit</strong></td><td><strong>$${netProfit}</strong></td></tr>
                </table>
                <div class="results">
                    <p>Partner 1 Share: $${typeof table.netProfit === 'number' ? (table.netProfit / 2).toFixed(2) : 'N/A'}</p>
                    <p>Partner 2 Share: $${typeof table.netProfit === 'number' ? (table.netProfit / 2).toFixed(2) : 'N/A'}</p>
                </div>
            </div>
        `;
        savedTablesDiv.innerHTML += tableHtml;
    });
}

// Expose necessary functions to window for HTML onclick attributes
window.confirmDelete = confirmDelete;
window.deleteTable = deleteTable;

// Initialize the app by loading Firebase config
document.addEventListener('DOMContentLoaded', loadFirebaseConfig);
