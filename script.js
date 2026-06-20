const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPamHEBnIo0Zz8U9AFSykbhWWC5_yVLgCwgLLksx2cb71EOW940WdSobvM6lvy_b3N/exec";

// Master dataset structures
let records = JSON.parse(localStorage.getItem('vmw_v5_data')) || [];
let wallets = JSON.parse(localStorage.getItem('vmw_wallets_data')) || {};

const todayStr = new Date().toISOString().split('T')[0];
document.getElementById('dateFilter').value = todayStr;

function handlePriceKey(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        addTaskRow();
        const rows = document.querySelectorAll('.task-desc');
        rows[rows.length - 1].focus();
    }
}

function addTaskRow(descValue = '', priceValue = '') {
    const container = document.getElementById('tasksContainer');
    const row = document.createElement('div');
    row.className = 'flex gap-2 task-row';
    row.innerHTML = `
        <input type="text" placeholder="Work Done (Optional)" value="${descValue}" class="flex-grow p-2 border rounded-lg outline-none task-desc">
        <input type="number" placeholder="Price" value="${priceValue}" class="w-32 p-2 border rounded-lg outline-none task-price" onkeydown="handlePriceKey(event)" oninput="calcLiveTotal()">
        <button type="button" onclick="this.parentElement.remove(); calcLiveTotal()" class="bg-red-100 text-red-600 px-4 rounded-lg font-bold hover:bg-red-200">×</button>
    `;
    container.appendChild(row);
}

// Generates unique structural key identifiers based on provided fields
function getWalletKey() {
    const vehicle = document.getElementById('vehicleNo').value.trim().toUpperCase();
    const owner = document.getElementById('ownerName').value.trim().toLowerCase();
    const contact = document.getElementById('contactNo').value.trim();
    
    if (vehicle) return "VEH_" + vehicle;
    if (contact) return "CON_" + contact;
    if (owner) return "OWN_" + owner;
    return null;
}

// Monitors customer inputs and updates UI status message flags for current wallets
function checkLinkedWallet() {
    const key = getWalletKey();
    const display = document.getElementById('currentWalletDisplay');
    const msgBox = document.getElementById('walletStatusMsg');
    
    if (key && wallets[key]) {
        const bal = wallets[key];
        display.textContent = "₹" + bal.toLocaleString('en-IN');
        if (bal > 0) {
            msgBox.textContent = `Linked wallet account balance detected: ₹${bal.toLocaleString('en-IN')}`;
            msgBox.classList.remove('hidden');
        } else {
            msgBox.classList.add('hidden');
        }
    } else {
        display.textContent = "₹0";
        msgBox.classList.add('hidden');
    }
    calcLiveTotal();
}

function calcLiveTotal() {
    const prices = document.querySelectorAll('.task-price');
    let total = 0;
    prices.forEach(p => total += (parseFloat(p.value) || 0));
    
    const walletKey = getWalletKey();
    let availableWallet = (walletKey && wallets[walletKey]) ? wallets[walletKey] : 0;
    
    let walletDeduction = 0;
    const useWalletChecked = document.getElementById('useWalletCheckbox').checked;
    
    if (useWalletChecked && availableWallet > 0) {
        if (availableWallet >= total) {
            walletDeduction = total;
        } else {
            walletDeduction = availableWallet;
        }
    }

    const cashPaid = parseFloat(document.getElementById('paidAmount').value) || 0;
    const balance = total - walletDeduction - cashPaid;

    document.getElementById('displayTotal').textContent = "₹" + total.toLocaleString('en-IN');
    document.getElementById('liveBalance').textContent = balance.toLocaleString('en-IN');
    
    return {
        total: total,
        walletDeduction: walletDeduction,
        cashPaid: cashPaid,
        balance: balance
    };
}

function resetForm() {
    document.getElementById('serviceForm').reset();
    document.getElementById('editId').value = "";
    document.getElementById('formTitle').innerHTML = '<span class="bg-blue-600 w-2 h-6 rounded mr-2"></span> New Service Entry';
    document.getElementById('submitBtn').textContent = "Save Entry";
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('cancelEdit').classList.add('hidden');
    document.getElementById('walletStatusMsg').classList.add('hidden');
    document.getElementById('useWalletCheckbox').checked = false;
    document.getElementById('tasksContainer').innerHTML = `
        <div class="flex gap-2 task-row">
            <input type="text" placeholder="Work Done (Optional)" class="flex-grow p-2 border rounded-lg outline-none task-desc">
            <input type="number" placeholder="Price" class="w-32 p-2 border rounded-lg outline-none task-price" onkeydown="handlePriceKey(event)" oninput="calcLiveTotal()">
            <button type="button" onclick="addTaskRow()" class="bg-blue-100 text-blue-600 px-4 rounded-lg font-bold">+</button>
        </div>`;
    document.getElementById('displayTotal').textContent = "₹0";
    document.getElementById('currentWalletDisplay').textContent = "₹0";
    document.getElementById('liveBalance').textContent = "0";
}

document.getElementById('serviceForm').onsubmit = (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    const editId = document.getElementById('editId').value;
    
    const taskDescs = document.querySelectorAll('.task-desc');
    const taskPrices = document.querySelectorAll('.task-price');
    let tasks = [];
    
    taskDescs.forEach((d, i) => {
        const p = parseFloat(taskPrices[i].value) || 0;
        const descText = d.value.trim() || "Unspecified Service Component";
        if (p > 0 || d.value.trim() !== "") {
            tasks.push({ desc: descText, price: p });
        }
    });

    const finance = calcLiveTotal();
    const walletKey = getWalletKey();
    const addToWallet = parseFloat(document.getElementById('addToWalletAmount').value) || 0;

    // Handle wallet logic adjustments
    if (walletKey) {
        if (!wallets[walletKey]) wallets[walletKey] = 0;
        
        // Reverse old allocation values if editing an existing entry
        if (editId) {
            const oldRecord = records.find(r => r.id == editId);
            if (oldRecord && oldRecord.walletKey === walletKey) {
                wallets[walletKey] += (oldRecord.walletDeduction || 0);
                wallets[walletKey] -= (oldRecord.walletDeposit || 0);
            }
        }
        
        // Execute financial impacts on running customer balances
        wallets[walletKey] += addToWallet;
        wallets[walletKey] -= finance.walletDeduction;
        localStorage.setItem('vmw_wallets_data', JSON.stringify(wallets));
    }

    const entryDate = editId ? (records.find(r => r.id == editId).date) : document.getElementById('dateFilter').value;

    const entry = {
        id: editId ? parseInt(editId) : Date.now(),
        date: entryDate,
        vehicleNo: document.getElementById('vehicleNo').value.toUpperCase().trim() || 'UNSPECIFIED VEHICLE',
        ownerName: document.getElementById('ownerName').value.trim() || 'Walk-In Customer',
        contactNo: document.getElementById('contactNo').value.trim() || '',
        tasks: tasks,
        total: finance.total,
        walletDeduction: finance.walletDeduction,
        paidAmount: finance.cashPaid,
        balance: finance.balance,
        walletDeposit: addToWallet,
        walletKey: walletKey,
        currentWalletSnapshot: walletKey ? wallets[walletKey] : 0
    };

    if (editId) {
        const idx = records.findIndex(r => r.id == editId);
        records[idx] = entry;
    } else {
        records.unshift(entry);
    }

    localStorage.setItem('vmw_v5_data', JSON.stringify(records));
    
    if (GOOGLE_SCRIPT_URL !== "YOUR_GOOGLE_WEB_APP_URL_HERE") {
        submitBtn.textContent = "Syncing...";
        submitBtn.disabled = true;
        fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify(entry) })
        .then(() => { resetForm(); render(); });
    } else {
        resetForm();
        render();
    }
};

function editRecord(id) {
    const r = records.find(x => x.id === id);
    document.getElementById('editId').value = r.id;
    document.getElementById('vehicleNo').value = r.vehicleNo === 'UNSPECIFIED VEHICLE' ? '' : r.vehicleNo;
    document.getElementById('ownerName').value = r.ownerName === 'Walk-In Customer' ? '' : r.ownerName;
    document.getElementById('contactNo').value = r.contactNo || '';
    document.getElementById('paidAmount').value = r.paidAmount || 0;
    document.getElementById('addToWalletAmount').value = r.walletDeposit || 0;
    document.getElementById('useWalletCheckbox').checked = (r.walletDeduction > 0);
    
    document.getElementById('formTitle').textContent = "Editing: " + r.vehicleNo;
    document.getElementById('submitBtn').textContent = "Update Record";
    document.getElementById('cancelEdit').classList.remove('hidden');
    
    const container = document.getElementById('tasksContainer');
    container.innerHTML = '';
    
    if(r.tasks.length === 0) {
        container.innerHTML = `
            <div class="flex gap-2 task-row">
                <input type="text" placeholder="Work Done (Optional)" class="flex-grow p-2 border rounded-lg outline-none task-desc">
                <input type="number" placeholder="Price" class="w-32 p-2 border rounded-lg outline-none task-price" onkeydown="handlePriceKey(event)" oninput="calcLiveTotal()">
                <button type="button" onclick="addTaskRow()" class="bg-blue-100 text-blue-600 px-4 rounded-lg font-bold">+</button>
            </div>`;
    } else {
        r.tasks.forEach((t, i) => {
            if(i === 0) {
                container.innerHTML = `
                    <div class="flex gap-2 task-row">
                        <input type="text" value="${t.desc}" class="flex-grow p-2 border rounded-lg outline-none task-desc">
                        <input type="number" value="${t.price}" class="w-32 p-2 border rounded-lg outline-none task-price" onkeydown="handlePriceKey(event)" oninput="calcLiveTotal()">
                        <button type="button" onclick="addTaskRow()" class="bg-blue-100 text-blue-600 px-4 rounded-lg font-bold">+</button>
                    </div>`;
            } else {
                addTaskRow(t.desc, t.price);
            }
        });
    }
    
    checkLinkedWallet();
}

function printInvoice(id) {
    const r = records.find(x => x.id === id);
    document.getElementById('invDate').textContent = `Date: ${new Date(r.date).toLocaleDateString('en-IN')}`;
    document.getElementById('invNumber').textContent = r.id.toString().slice(-6);
    document.getElementById('invOwner').textContent = r.ownerName;
    document.getElementById('invContact').textContent = r.contactNo ? "Contact: " + r.contactNo : "";
    document.getElementById('invVehicle').textContent = r.vehicleNo;
    document.getElementById('invTotal').textContent = "₹" + r.total.toLocaleString('en-IN');
    document.getElementById('invWalletPaid').textContent = "₹" + (r.walletDeduction || 0).toLocaleString('en-IN');
    document.getElementById('invPaid').textContent = "₹" + (r.paidAmount || 0).toLocaleString('en-IN');
    document.getElementById('invBalance').textContent = "₹" + (r.balance || 0).toLocaleString('en-IN');
    
    const invTasks = document.getElementById('invTasks');
    invTasks.innerHTML = '';
    
    if(r.tasks.length === 0) {
        invTasks.innerHTML = `<tr><td class="p-3 text-gray-400 italic">General Maintenance Check</td><td class="p-3 text-right">₹${r.total.toLocaleString('en-IN')}</td></tr>`;
    } else {
        r.tasks.forEach(t => {
            invTasks.innerHTML += `<tr><td class="p-3">${t.desc}</td><td class="p-3 text-right">₹${t.price.toLocaleString('en-IN')}</td></tr>`;
        });
    }
    window.print();
}

function render() {
    const body = document.getElementById('recordsBody');
    const search = document.getElementById('searchInput').value.toLowerCase();
    const selectedDate = document.getElementById('dateFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    body.innerHTML = '';
    
    let totalRev = 0;
    let totalOut = 0;
    let count = 0;

    records.forEach(r => {
        const dateMatch = r.date === selectedDate;
        const searchMatch = r.vehicleNo.toLowerCase().includes(search) || 
                            r.ownerName.toLowerCase().includes(search) || 
                            (r.contactNo && r.contactNo.includes(search));
        
        let statusMatch = true;
        if(statusFilter === 'paid') statusMatch = (r.balance <= 0);
        if(statusFilter === 'pending') statusMatch = (r.balance > 0);

        if (dateMatch && searchMatch && statusMatch) {
            count++;
            totalRev += r.total;
            totalOut += (r.balance || 0);

            const statusClass = r.balance <= 0 ? 'status-paid' : ((r.paidAmount > 0 || r.walletDeduction > 0) ? 'status-partial' : 'status-unpaid');
            const statusText = r.balance <= 0 ? 'Paid' : ((r.paidAmount > 0 || r.walletDeduction > 0) ? 'Partial' : 'Unpaid');

            let detailedPaymentStr = `₹${(r.paidAmount || 0).toLocaleString('en-IN')} Cash`;
            if (r.walletDeduction > 0) {
                detailedPaymentStr += `<br><span class="text-[10px] text-blue-700 font-medium">₹${r.walletDeduction.toLocaleString('en-IN')} Wallet</span>`;
            }
            if (r.walletDeposit > 0) {
                detailedPaymentStr += `<br><span class="text-[10px] text-emerald-700 font-medium">+₹${r.walletDeposit.toLocaleString('en-IN')} Adv.</span>`;
            }

            body.innerHTML += `
                <tr class="hover:bg-blue-50 transition">
                    <td class="p-4">
                        <div class="font-bold text-blue-900">${r.vehicleNo}</div>
                        <div class="text-sm font-semibold text-gray-700">${r.ownerName}</div>
                        <div class="text-[10px] text-gray-400">${r.contactNo || 'No Contact Number'}</div>
                    </td>
                    <td class="p-4"><ul class="text-[10px] text-gray-500">${r.tasks.length === 0 ? '<li>• Maintenance</li>' : r.tasks.map(t => `<li>• ${t.desc}</li>`).join('')}</ul></td>
                    <td class="p-4 font-bold text-sm">₹${r.total.toLocaleString('en-IN')}</td>
                    <td class="p-4 text-xs text-gray-600 font-normal leading-tight">${detailedPaymentStr}</td>
                    <td class="p-4">
                        <div class="text-sm font-bold text-red-600">₹${(r.balance || 0).toLocaleString('en-IN')}</div>
                        <div class="px-2 py-0.5 rounded-full inline-block text-[9px] font-bold uppercase ${statusClass}">${statusText}</div>
                    </td>
                    <td class="p-4 text-right space-x-1 whitespace-nowrap">
                        <button onclick="editRecord(${r.id})" class="bg-amber-100 text-amber-700 px-3 py-1 rounded text-xs font-bold hover:bg-amber-200">Edit</button>
                        <button onclick="printInvoice(${r.id})" class="bg-gray-800 text-white px-3 py-1 rounded text-xs font-bold hover:bg-black">Bill</button>
                        <button onclick="if(confirm('Delete?')){records = records.filter(x => x.id !== ${r.id}); localStorage.setItem('vmw_v5_data', JSON.stringify(records)); render();}" class="text-red-400 font-bold ml-2">×</button>
                    </td>
                </tr>`;
        }
    });

    document.getElementById('statTotalServices').textContent = count;
    document.getElementById('statTotalAmount').textContent = `₹${totalRev.toLocaleString('en-IN')}`;
    document.getElementById('statPendingAmount').textContent = `₹${totalOut.toLocaleString('en-IN')}`;
}

// Initial Run Execution
document.getElementById('currentDateDisplay').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
render();
