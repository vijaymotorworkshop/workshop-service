// Google Web App Integration Link
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPamHEBnIo0Zz8U9AFSykbhWWC5_yVLgCwgLLksx2cb71EOW940WdSobvM6lvy_b3N/exec";
let records = JSON.parse(localStorage.getItem('vmw_v5_data')) || [];

// Set default calendar picker layout to today's date
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
        <input type="text" placeholder="Work Done" value="${descValue}" class="flex-grow p-2 border rounded-lg outline-none task-desc" required>
        <input type="number" placeholder="Price" value="${priceValue}" class="w-32 p-2 border rounded-lg outline-none task-price" onkeydown="handlePriceKey(event)" oninput="calcLiveTotal()" required>
        <button type="button" onclick="this.parentElement.remove(); calcLiveTotal()" class="bg-red-100 text-red-600 px-4 rounded-lg font-bold hover:bg-red-200">×</button>
    `;
    container.appendChild(row);
}

function calcLiveTotal() {
    const prices = document.querySelectorAll('.task-price');
    let total = 0;
    prices.forEach(p => total += (parseFloat(p.value) || 0));
    
    const paid = parseFloat(document.getElementById('paidAmount').value) || 0;
    const balance = total - paid;

    document.getElementById('displayTotal').textContent = "₹" + total.toLocaleString('en-IN');
    document.getElementById('liveBalance').textContent = balance.toLocaleString('en-IN');
}

function resetForm() {
    document.getElementById('serviceForm').reset();
    document.getElementById('editId').value = "";
    document.getElementById('formTitle').innerHTML = '<span class="bg-blue-600 w-2 h-6 rounded mr-2"></span> New Service Entry';
    document.getElementById('submitBtn').textContent = "Save Entry";
    document.getElementById('submitBtn').disabled = false;
    document.getElementById('cancelEdit').classList.add('hidden');
    document.getElementById('tasksContainer').innerHTML = `
        <div class="flex gap-2 task-row">
            <input type="text" placeholder="Work Done" class="flex-grow p-2 border rounded-lg outline-none task-desc" required>
            <input type="number" placeholder="Price" class="w-32 p-2 border rounded-lg outline-none task-price" onkeydown="handlePriceKey(event)" oninput="calcLiveTotal()" required>
            <button type="button" onclick="addTaskRow()" class="bg-blue-100 text-blue-600 px-4 rounded-lg font-bold">+</button>
        </div>`;
    document.getElementById('displayTotal').textContent = "₹0";
    document.getElementById('liveBalance').textContent = "0";
}

document.getElementById('serviceForm').onsubmit = (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    const editId = document.getElementById('editId').value;
    
    const taskDescs = document.querySelectorAll('.task-desc');
    const taskPrices = document.querySelectorAll('.task-price');
    let tasks = [];
    let total = 0;
    taskDescs.forEach((d, i) => {
        const p = parseFloat(taskPrices[i].value) || 0;
        tasks.push({ desc: d.value, price: p });
        total += p;
    });

    const paid = parseFloat(document.getElementById('paidAmount').value) || 0;
    const entryDate = editId ? (records.find(r => r.id == editId).date) : document.getElementById('dateFilter').value;

    const entry = {
        id: editId ? parseInt(editId) : Date.now(),
        date: entryDate,
        vehicleNo: document.getElementById('vehicleNo').value.toUpperCase(),
        ownerName: document.getElementById('ownerName').value,
        contactNo: document.getElementById('contactNo').value,
        tasks: tasks,
        total: total,
        paidAmount: paid,
        balance: total - paid
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
    document.getElementById('vehicleNo').value = r.vehicleNo;
    document.getElementById('ownerName').value = r.ownerName;
    document.getElementById('contactNo').value = r.contactNo || '';
    document.getElementById('paidAmount').value = r.paidAmount || 0;
    document.getElementById('formTitle').textContent = "Editing: " + r.vehicleNo;
    document.getElementById('submitBtn').textContent = "Update Record";
    document.getElementById('cancelEdit').classList.remove('hidden');
    
    const container = document.getElementById('tasksContainer');
    container.innerHTML = '';
    r.tasks.forEach((t, i) => {
        if(i === 0) {
            container.innerHTML = `
                <div class="flex gap-2 task-row">
                    <input type="text" value="${t.desc}" class="flex-grow p-2 border rounded-lg outline-none task-desc" required>
                    <input type="number" value="${t.price}" class="w-32 p-2 border rounded-lg outline-none task-price" onkeydown="handlePriceKey(event)" oninput="calcLiveTotal()" required>
                    <button type="button" onclick="addTaskRow()" class="bg-blue-100 text-blue-600 px-4 rounded-lg font-bold">+</button>
                </div>`;
        } else {
            addTaskRow(t.desc, t.price);
        }
    });
    calcLiveTotal();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function printInvoice(id) {
    const r = records.find(x => x.id === id);
    document.getElementById('invDate').textContent = `Date: ${new Date(r.date).toLocaleDateString('en-IN')}`;
    document.getElementById('invNumber').textContent = r.id.toString().slice(-6);
    document.getElementById('invOwner').textContent = r.ownerName;
    document.getElementById('invContact').textContent = r.contactNo ? "Contact: " + r.contactNo : "";
    document.getElementById('invVehicle').textContent = r.vehicleNo;
    document.getElementById('invTotal').textContent = "₹" + r.total.toLocaleString('en-IN');
    document.getElementById('invPaid').textContent = "₹" + (r.paidAmount || 0).toLocaleString('en-IN');
    document.getElementById('invBalance').textContent = "₹" + (r.balance || 0).toLocaleString('en-IN');
    
    const invTasks = document.getElementById('invTasks');
    invTasks.innerHTML = '';
    r.tasks.forEach(t => {
        invTasks.innerHTML += `<tr><td class="p-3">${t.desc}</td><td class="p-3 text-right">₹${t.price.toLocaleString('en-IN')}</td></tr>`;
    });
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

            const statusClass = r.balance <= 0 ? 'status-paid' : (r.paidAmount > 0 ? 'status-partial' : 'status-unpaid');
            const statusText = r.balance <= 0 ? 'Paid' : (r.paidAmount > 0 ? 'Partial' : 'Unpaid');

            body.innerHTML += `
                <tr class="hover:bg-blue-50 transition">
                    <td class="p-4">
                        <div class="font-bold text-blue-900">${r.vehicleNo}</div>
                        <div class="text-sm font-semibold">${r.ownerName}</div>
                        <div class="text-[10px] text-gray-400">${r.contactNo || 'No Contact'}</div>
                    </td>
                    <td class="p-4"><ul class="text-[10px] text-gray-500">${r.tasks.map(t => `<li>• ${t.desc}</li>`).join('')}</ul></td>
                    <td class="p-4 font-bold text-sm">₹${r.total.toLocaleString('en-IN')}</td>
                    <td class="p-4 text-sm text-green-700 font-semibold">₹${(r.paidAmount || 0).toLocaleString('en-IN')}</td>
                    <td class="p-4">
                        <div class="text-sm font-bold text-red-600">₹${(r.balance || 0).toLocaleString('en-IN')}</div>
                        <div class="px-2 py-0.5 rounded-full inline-block text-[9px] font-bold uppercase ${statusClass}">${statusText}</div>
                    </td>
                    <td class="p-4 text-right space-x-1">
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

// Initial Run
document.getElementById('currentDateDisplay').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
render();