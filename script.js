// Initial Data or Load from LocalStorage
let distribuidores = JSON.parse(localStorage.getItem('distribuidores_v2')) || [];

// Atualiza o local storage
function saveToLocalStorage() {
    localStorage.setItem('distribuidores_v2', JSON.stringify(distribuidores));
}

// Navigation Logic
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view-section');
const pageTitle = document.getElementById('pageTitle');

const viewTitles = {
    'dashboard': 'Visão Geral do Monitoramento',
    'cadastro': 'Novo Distribuidor',
    'todos': 'Todos os Distribuidores'
};

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all nav items
        navItems.forEach(nav => nav.classList.remove('active'));
        // Add active to clicked
        item.classList.add('active');
        
        // Hide all views
        views.forEach(view => view.classList.remove('active'));
        
        // Show target view
        const targetView = item.getAttribute('data-view');
        document.getElementById(`view-${targetView}`).classList.add('active');
        pageTitle.innerText = viewTitles[targetView];

        // Refresh data when navigating
        if(targetView === 'dashboard') updateDashboard();
        if(targetView === 'todos') renderTodosTable();
    });
});

// Helper: Calculate Contract Status
function getContractStatus(dataFimStr) {
    const today = new Date();
    // Resetting hours to compare just the date properly
    today.setHours(0, 0, 0, 0); 
    
    // Adding timezone offset handling so the date parses exactly as the string says locally
    const [year, month, day] = dataFimStr.split('-');
    const endDate = new Date(year, month - 1, day);
    
    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return { status: 'Vencido', class: 'badge-danger', days: diffDays };
    } else if (diffDays <= 30) {
        return { status: 'Vence em breve', class: 'badge-warning', days: diffDays };
    } else {
        return { status: 'No prazo', class: 'badge-success', days: diffDays };
    }
}

// Helper: Format Date
function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// Dashboard Update
function updateDashboard(filterText = '') {
    const ativosTableBody = document.getElementById('ativosTableBody');
    ativosTableBody.innerHTML = '';
    
    const filtered = distribuidores.filter(dist => 
        dist.nome.toLowerCase().includes(filterText.toLowerCase()) || 
        dist.documento.includes(filterText)
    );
    
    filtered.forEach(dist => {
        const contractInfo = getContractStatus(dist.dataFim);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${dist.nome}</strong></td>
            <td>${dist.documento}</td>
            <td>${formatDate(dist.dataInicio)}</td>
            <td>${formatDate(dist.dataFim)}</td>
            <td>${contractInfo.days < 0 ? 'Vencido' : contractInfo.days + ' dias'}</td>
            <td><span class="badge ${contractInfo.class}">${contractInfo.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-qr" onclick="openQrModal(${dist.id})" title="Gerar QR Code">
                        <i class="fa-solid fa-qrcode"></i>
                    </button>
                    <button class="action-btn" onclick="deleteDistribuidor(${dist.id})" title="Remover">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        ativosTableBody.appendChild(tr);
    });
    
    // Counts for the summary cards (always based on total data)
    let totalAtivos = 0;
    let totalVencendo = 0;
    let totalExpirados = 0;
    
    distribuidores.forEach(dist => {
        const c = getContractStatus(dist.dataFim);
        if (c.days < 0) totalExpirados++;
        else if (c.days <= 30) totalVencendo++;
        else totalAtivos++;
    });
    
    document.getElementById('countAtivos').innerText = totalAtivos;
    document.getElementById('countVencendo').innerText = totalVencendo;
    document.getElementById('countExpirados').innerText = totalExpirados;
    document.getElementById('countTotal').innerText = distribuidores.length;
}

// Todos os Distribuidores Update
function renderTodosTable(filterText = '') {
    const todosTableBody = document.getElementById('todosTableBody');
    todosTableBody.innerHTML = '';
    
    const filtered = distribuidores.filter(dist => 
        dist.nome.toLowerCase().includes(filterText.toLowerCase()) || 
        dist.documento.includes(filterText)
    );

    filtered.forEach(dist => {
        const contractInfo = getContractStatus(dist.dataFim);
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${dist.nome}</strong></td>
            <td>${dist.documento}</td>
            <td>${formatDate(dist.dataFim)}</td>
            <td><span class="badge ${contractInfo.class}">${contractInfo.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-qr" onclick="openQrModal(${dist.id})" title="Gerar QR Code">
                        <i class="fa-solid fa-qrcode"></i>
                    </button>
                    <button class="action-btn" onclick="deleteDistribuidor(${dist.id})" title="Remover">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        todosTableBody.appendChild(tr);
    });
}

// Form Submit
document.getElementById('distribuidorForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nome = document.getElementById('nome').value;
    const documento = document.getElementById('documento').value;
    const dataInicio = document.getElementById('dataInicio').value;
    const dataFim = document.getElementById('dataFim').value;
    
    if (dataInicio > dataFim) {
        showCustomAlert("Atenção", "A data de início não pode ser maior que a data de vencimento!", "warning");
        return;
    }

    const newDist = {
        id: Date.now(),
        nome,
        documento,
        dataInicio,
        dataFim
    };
    
    distribuidores.push(newDist);
    saveToLocalStorage();
    
    // Clear form
    e.target.reset();
    
    showCustomAlert("Sucesso", "Distribuidor cadastrado com sucesso!", "success");
    
    // Go to dashboard
    navItems[0].click();
});

// Delete Distribuidor
window.deleteDistribuidor = function(id) {
    showCustomConfirm("Excluir Distribuidor", "Tem certeza que deseja remover este distribuidor?", () => {
        distribuidores = distribuidores.filter(d => d.id !== id);
        saveToLocalStorage();
        renderTodosTable();
        updateDashboard();
    });
}

// Search Todos
document.getElementById('searchTodos').addEventListener('input', (e) => {
    renderTodosTable(e.target.value);
});

// Search Dashboard
if (document.getElementById('searchDashboard')) {
    document.getElementById('searchDashboard').addEventListener('input', (e) => {
        updateDashboard(e.target.value);
    });
}

// Initialization
saveToLocalStorage(); // Ensure sample data is saved if running first time
updateDashboard();
renderTodosTable();

// --- QR CODE LOGIC ---
function b64EncodeUnicode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
}

let qrcodeInstance = null;

window.openQrModal = function(id) {
    const dist = distribuidores.find(d => d.id === id);
    if (!dist) return;

    const modal = document.getElementById('qrModal');
    const qrContainer = document.getElementById('qrcode');
    
    // Clear previous QR
    qrContainer.innerHTML = '';
    
    // Montar os dados
    const dataObj = {
        n: dist.nome,
        v: dist.dataFim
    };
    
    const encodedData = b64EncodeUnicode(JSON.stringify(dataObj));
    
    // Gerar a URL para o status.html de forma robusta (perfeito para GitHub Pages)
    let basePath = window.location.pathname;
    if (basePath.endsWith('.html')) {
        basePath = basePath.substring(0, basePath.lastIndexOf('/'));
    }
    if (!basePath.endsWith('/')) {
        basePath += '/';
    }
    const statusUrl = window.location.origin + basePath + 'status.html';
    
    const finalUrl = `${statusUrl}?d=${encodedData}`;

    qrcodeInstance = new QRCode(qrContainer, {
        text: finalUrl,
        width: 200,
        height: 200,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.L
    });

    modal.classList.add('active');
}

window.closeQrModal = function() {
    document.getElementById('qrModal').classList.remove('active');
}

// --- CUSTOM MODALS LOGIC ---

window.showCustomAlert = function(title, message, type = 'info') {
    const modal = document.getElementById('customAlertModal');
    document.getElementById('customAlertTitle').innerText = title;
    document.getElementById('customAlertMessage').innerText = message;
    
    const iconDiv = document.getElementById('customAlertIcon');
    iconDiv.className = 'modal-icon-large'; // reset
    if (type === 'success') {
        iconDiv.classList.add('icon-success');
        iconDiv.innerHTML = '<i class="fa-solid fa-check"></i>';
    } else if (type === 'warning') {
        iconDiv.classList.add('icon-warning');
        iconDiv.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
    } else {
        iconDiv.innerHTML = '<i class="fa-solid fa-info"></i>';
    }
    
    modal.classList.add('active');
}

window.closeCustomAlert = function() {
    document.getElementById('customAlertModal').classList.remove('active');
}

let confirmCallback = null;

window.showCustomConfirm = function(title, message, onConfirm) {
    const modal = document.getElementById('customConfirmModal');
    document.getElementById('customConfirmTitle').innerText = title;
    document.getElementById('customConfirmMessage').innerText = message;
    
    confirmCallback = onConfirm;
    
    modal.classList.add('active');
}

window.closeCustomConfirm = function() {
    document.getElementById('customConfirmModal').classList.remove('active');
    confirmCallback = null;
}

document.getElementById('customConfirmBtn').addEventListener('click', () => {
    if (confirmCallback) {
        confirmCallback();
    }
    closeCustomConfirm();
});
