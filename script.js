const API_BASE_URL = "https://latina-bare-chronic-franklin.trycloudflare.com";

let userSession = { isLoggedIn: false, username: 'visitante' };

document.addEventListener('DOMContentLoaded', () => {
    checkLocalStorage();
    initLogin();
    initModals();
});

/* FILTROS */
window.filterPosts = function(category) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase().includes(category.toLowerCase()));
    });
    document.querySelectorAll('.card').forEach(card => {
        const match = category === 'all' || card.getAttribute('data-category') === category;
        card.style.display = match ? 'flex' : 'none';
    });
};

/* LOGIN */
function checkLocalStorage() {
    const u = localStorage.getItem('rarefast_user');
    if (u) performLogin(u, false);
}

function initLogin() {
    const modal = document.getElementById('loginModal');
    const btn = document.getElementById('btnLogin');
    
    btn.onclick = () => userSession.isLoggedIn ? performLogout() : modal.style.display = 'flex';
    document.getElementById('loginForm').onsubmit = async (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        const msg = document.getElementById('loginStatus');
        
        msg.innerText = "Conectando...";
        try {
            const req = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({username: user})
            });
            if (req.ok) {
                performLogin(user, true);
                modal.style.display = 'none';
                msg.innerText = "";
                document.getElementById('loginForm').reset();
            } else {
                msg.innerText = "Erro: Acesso negado.";
            }
        } catch { msg.innerText = "Erro: Servidor Offline."; }
    };
}

function performLogin(user, save) {
    userSession = { isLoggedIn: true, username: user };
    if (save) localStorage.setItem('rarefast_user', user);
    
    const btn = document.getElementById('btnLogin');
    btn.innerText = `logout(${user})`; // MOSTRA O NOME
    btn.style.borderColor = "var(--neon-pink)";
    
    document.querySelectorAll('.comments-section').forEach(el => el.remove()); // Reseta para recarregar
    renderComments();
}

function performLogout() {
    userSession = { isLoggedIn: false, username: 'visitante' };
    localStorage.removeItem('rarefast_user');
    const btn = document.getElementById('btnLogin');
    btn.innerText = "login()";
    btn.style.borderColor = "var(--neon-blue)";
    document.querySelectorAll('.comments-section').forEach(s => s.style.display = 'none');
}

/* MODAIS */
function initModals() {
    const modals = document.querySelectorAll('.modal');
    window.onclick = (e) => { if ([...modals].includes(e.target)) e.target.style.display = 'none'; };
    document.querySelectorAll('.close-btn').forEach(b => b.onclick = () => b.closest('.modal').style.display = 'none');
}

window.openPost = function(btn) {
    const card = btn.closest('.card');
    document.getElementById('modalTitle').innerText = card.querySelector('h4').innerText;
    document.getElementById('modalBody').innerHTML = card.querySelector('.full-content').innerHTML;
    document.getElementById('postModal').style.display = 'flex';
}

window.closePost = function() { document.getElementById('postModal').style.display = 'none'; }

/* COMENTÁRIOS */
function renderComments() {
    document.querySelectorAll('.card').forEach((card, idx) => {
        const pid = `post_${idx}`;
        if (card.querySelector('.comments-section')) return;

        const div = document.createElement('div');
        div.className = 'comments-section';
        div.style.display = 'block';
        
        // SVG SETA GROSSA
        div.innerHTML = `
            <h5>// LOGS</h5>
            <ul class="comment-list" id="list-${pid}"><li>Carregando...</li></ul>
            <form class="comment-form" onsubmit="sendComment(event, '${pid}')">
                <input class="comment-input" type="text" placeholder="Escrever log..." required>
                <button type="submit" class="btn-send">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </button>
            </form>
        `;
        card.appendChild(div);
        loadComments(pid);
    });
}

/* Substitua a função loadComments antiga por esta: */

async function loadComments(pid) {
    const list = document.getElementById(`list-${pid}`);
    
    // Remove botão antigo se existir para não duplicar ao recarregar
    const oldBtn = list.parentNode.querySelector('.load-more-btn');
    if (oldBtn) oldBtn.remove();

    try {
        const res = await fetch(`${API_BASE_URL}/comments/${pid}`);
        let data = await res.json();
        list.innerHTML = "";

        if (data.length === 0) {
            list.innerHTML = "<li style='opacity:0.5; font-size:0.8rem; font-style:italic;'>Nenhum dado neste setor.</li>";
            return;
        }

        // ORDENAÇÃO: MAIS NOVO PRIMEIRO
        data.sort((a, b) => new Date(b.timestamp + 'Z') - new Date(a.timestamp + 'Z'));

        const LIMIT = 3;
        
        // Renderiza a lista
        data.forEach((c, i) => {
            const date = new Date(c.timestamp + 'Z').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
            const li = document.createElement('li');
            li.className = 'comment-item';
            
            // Se passar do limite, esconde e marca com a classe 'hidden'
            if (i >= LIMIT) { 
                li.style.display = 'none'; 
                li.classList.add('hidden'); 
            }
            
            li.innerHTML = `<span class="comment-author">@${c.username} <span class="comment-date">${date}</span></span> ${c.content}`;
            list.appendChild(li);
        });

        // LÓGICA DO BOTÃO TOGGLE (VER MAIS / VER MENOS)
        if (data.length > LIMIT) {
            const remaining = data.length - LIMIT;
            const btn = document.createElement('button');
            btn.className = 'load-more-btn';
            
            // Estado inicial: "Ver mais"
            let isExpanded = false;
            
            // Texto inicial
            btn.innerHTML = `
                Ver ${remaining} logs antigos 
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            `;

            btn.onclick = () => {
                const hiddenItems = list.querySelectorAll('.hidden');
                
                if (!isExpanded) {
                    // AÇÃO: EXPANDIR
                    hiddenItems.forEach(l => {
                        l.style.display = 'flex';
                        l.style.animation = "slideDown 0.3s ease"; // Efeito visual
                    });
                    
                    // Muda botão para "Ocultar" (Seta pra cima)
                    btn.innerHTML = `
                        Ocultar logs antigos
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    `;
                    isExpanded = true;
                    
                } else {
                    // AÇÃO: RECOLHER
                    hiddenItems.forEach(l => l.style.display = 'none');
                    
                    // Volta texto original (Seta pra baixo)
                    btn.innerHTML = `
                        Ver ${remaining} logs antigos 
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    `;
                    isExpanded = false;
                    
                    // Opcional: Rola suavemente de volta para o topo da lista para o usuário não se perder
                    list.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            };
            
            // Insere o botão LOGO APÓS a lista (e antes do form, graças ao insertBefore nextSibling)
            list.parentNode.insertBefore(btn, list.nextSibling);
        }
        
    } catch (e) { 
        console.error(e);
        list.innerHTML = "<li style='color:var(--neon-pink)'>Erro: Servidor Offline</li>"; 
    }
}

window.sendComment = async (e, pid) => {
    e.preventDefault();
    const inp = e.target.querySelector('input');
    const val = inp.value.trim();
    if (!val) return;

    await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ post_id: pid, username: userSession.username, content: val })
    });
    inp.value = "";
    loadComments(pid);
};