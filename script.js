/* =========================================================
   RAREFAST SYSTEM CONTROLLER (Unified)
   ========================================================= */

const API_BASE_URL = "https://saints-sanyo-stretch-outputs.trycloudflare.com";

let userSession = { isLoggedIn: false, username: 'visitante' };

// Estado Global da Grid (Controla o que está visível)
let gridState = {
    category: 'all',
    searchTerm: '',
    limit: 3 // Começa mostrando 3 itens
};

/* --- 1. INICIALIZAÇÃO --- */
document.addEventListener('DOMContentLoaded', () => {
    checkLocalStorage();
    initLogin();
    initModals();
    renderComments(); 
    renderGrid();
});

/* --- 2. SISTEMA DE GRID (BUSCA + FILTROS + PAGINAÇÃO) --- */

// Chamado pelo input de busca: onkeyup="handleSearch(this.value)"
window.handleSearch = function(val) {
    // 1. Atualiza o estado da grid
    gridState.searchTerm = val.toLowerCase();
    gridState.limit = 3; 

    // 2. Controla visibilidade do botão "X"
    const clearBtn = document.getElementById('rfClearBtn');
    if (clearBtn) {
        // Se tiver texto, mostra o X. Se vazio, esconde.
        clearBtn.style.display = val.length > 0 ? 'flex' : 'none';
    }

    // 3. Atualiza a tela
    renderGrid();
};

// Chamado ao clicar no botão "X"
window.clearSearch = function() {
    const input = document.getElementById('rfSearchInput');
    const clearBtn = document.getElementById('rfClearBtn');
    
    // Limpa o input visualmente
    if (input) {
        input.value = '';
        input.focus(); // Mantém o foco para digitar outra coisa
    }

    // Esconde o botão X
    if (clearBtn) clearBtn.style.display = 'none';

    // Reseta a busca no sistema
    gridState.searchTerm = '';
    gridState.limit = 3;
    
    renderGrid(); // Atualiza a grid para mostrar tudo de novo
};


// Chamado pelos botões de filtro
window.filterPosts = function(category) {
    gridState.category = category;
    gridState.limit = 3; // Reseta a paginação ao trocar categoria
    
    // Atualiza visual dos botões de filtro
    document.querySelectorAll('.filter-btn').forEach(btn => {
        const btnText = btn.innerText.toLowerCase();
        const catLower = category.toLowerCase();
        
        // Lógica para marcar ativo (considerando /todos e /categoria)
        if (catLower === 'all' && btnText.includes('todos')) {
            btn.classList.add('active');
        } else if (btnText.includes(catLower) && catLower !== 'all') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    renderGrid();
};

// Chamado pelos botões [+] Carregar Mais e [-] Menos
window.changeLimit = function(delta) {
    gridState.limit += delta;
    if (gridState.limit < 3) gridState.limit = 3; // Nunca mostra menos que 3
    renderGrid();
};

// O MOTOR PRINCIPAL: Decide qual card aparece
function renderGrid() {
    const cards = Array.from(document.querySelectorAll('.card'));
    
    // Seleciona os elementos novos
    const container = document.getElementById('rfPaginationArea');
    const btnMore = document.getElementById('rfBtnMore');
    const btnLess = document.getElementById('rfBtnLess');

    // 1. Filtra a lista total baseada em Categoria E Busca
    const visibleCards = cards.filter(card => {
        const cardCat = card.getAttribute('data-category');
        const cardText = card.innerText.toLowerCase(); 
        
        const matchCat = gridState.category === 'all' || cardCat === gridState.category;
        const matchSearch = gridState.searchTerm === '' || cardText.includes(gridState.searchTerm);
        
        return matchCat && matchSearch;
    });

    // 2. Esconde TUDO primeiro
    cards.forEach(card => card.style.display = 'none');

    // 3. Mostra apenas a fatia (slice) permitida pelo limite
    const shownCards = visibleCards.slice(0, gridState.limit);
    shownCards.forEach(card => {
        card.style.display = 'flex';
        card.style.animation = 'fadeIn 0.5s ease';
    });

    // --- LÓGICA DA UI DE PAGINAÇÃO ---
    if (visibleCards.length === 0) {
        if(container) container.style.display = 'none';
        return;
    }

    if(container) {
        container.style.display = 'flex'; // Garante que volta a aparecer
        
        const currentlyShown = shownCards.length;
        const total = visibleCards.length;

        // Controle Botão Expandir (More)
        if(btnMore) {
            if (currentlyShown < total) {
                btnMore.style.display = 'flex';
                // Atualiza o texto dinamicamente (o CSS força minúsculo)
                const remaining = total - currentlyShown;
                btnMore.innerHTML = `expandir dados (+${remaining}) &gt;`;
            } else {
                btnMore.style.display = 'none';
            }
        }

        // Controle Botão Recolher (Less)
        if(btnLess) {
            // Só mostra se expandiu além do padrão (3)
            btnLess.style.display = (gridState.limit > 3) ? 'flex' : 'none';
        }
    }
}

/* --- 3. LOGIN E SESSÃO --- */
function checkLocalStorage() {
    const u = localStorage.getItem('rarefast_user');
    if (u) performLogin(u, false);
}

function initLogin() {
    const modal = document.getElementById('loginModal');
    const btn = document.getElementById('btnLogin');
    
    if(btn) btn.onclick = () => userSession.isLoggedIn ? performLogout() : modal.style.display = 'flex';
    
    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.onsubmit = async (e) => {
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
}

function performLogin(user, save) {
    userSession = { isLoggedIn: true, username: user };
    if (save) localStorage.setItem('rarefast_user', user);
    
    const btn = document.getElementById('btnLogin');
    if(btn) {
        btn.innerText = `logout(${user})`;
        btn.style.borderColor = "var(--neon-pink)";
    }
    
    // Reseta comentários para mostrar opções de logado
    document.querySelectorAll('.comments-section').forEach(el => el.remove()); 
    renderComments();
}

function performLogout() {
    userSession = { isLoggedIn: false, username: 'visitante' };
    localStorage.removeItem('rarefast_user');
    const btn = document.getElementById('btnLogin');
    if(btn) {
        btn.innerText = "login()";
        btn.style.borderColor = "var(--neon-blue)";
    }
    // Esconde chats
    document.querySelectorAll('.comments-section').forEach(s => s.style.display = 'none');
}

/* --- 4. MODAIS --- */
function initModals() {
    const modals = document.querySelectorAll('.modal');
    window.onclick = (e) => { if ([...modals].includes(e.target)) e.target.style.display = 'none'; };
    document.querySelectorAll('.close-btn').forEach(b => b.onclick = () => b.closest('.modal').style.display = 'none');
}

window.openPost = function(btn) {
    const card = btn.closest('.card');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    const modalEl = document.getElementById('postModal');

    if(titleEl && bodyEl && modalEl) {
        titleEl.innerText = card.querySelector('h4').innerText;
        bodyEl.innerHTML = card.querySelector('.full-content').innerHTML;
        modalEl.style.display = 'flex';
    }
}

window.closePost = function() { 
    const modalEl = document.getElementById('postModal');
    if(modalEl) modalEl.style.display = 'none'; 
}

/* --- 5. COMENTÁRIOS / LOGS --- */
function renderComments() {
    const cards = document.querySelectorAll('.card');
    if(cards.length === 0) return;

    cards.forEach((card, idx) => {
        // Usa o índice como ID único temporário
        const pid = `post_${idx}`; 
        
        // Se já tem log, não cria de novo
        if (card.querySelector('.comments-section')) return;

        const div = document.createElement('div');
        div.className = 'comments-section';
        // Mostra logs só se estiver logado (opcional, pode deixar 'block' sempre se preferir)
        div.style.display = userSession.isLoggedIn ? 'block' : 'none'; 
        
        div.innerHTML = `
            <h5>// LOGS</h5>
            <ul class="comment-list" id="list-${pid}"><li>Carregando...</li></ul>
            <form class="comment-form" onsubmit="sendComment(event, '${pid}')">
                <input class="comment-input" type="text" placeholder="Escrever log..." required ${userSession.isLoggedIn ? '' : 'disabled title="Login necessário"'}>
                <button type="submit" class="btn-send" ${userSession.isLoggedIn ? '' : 'disabled'}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 1792 1792"><path fill="currentColor" d="M1764 11q33 24 27 64l-256 1536q-5 29-32 45q-14 8-31 8q-11 0-24-5l-453-185l-242 295q-18 23-49 23q-13 0-22-4q-19-7-30.5-23.5T640 1728v-349l864-1059l-1069 925l-395-162q-37-14-40-55q-2-40 32-59L1696 9q15-9 32-9q20 0 36 11"/></svg>
                </button>
            </form>
        `;
        card.appendChild(div);
        
        if (userSession.isLoggedIn) {
            loadComments(pid);
        } else {
            const list = document.getElementById(`list-${pid}`);
            if(list) list.innerHTML = "<li style='opacity:0.5; font-size:0.8rem; font-style:italic;'>Acesso restrito: Faça login para visualizar logs.</li>";
        }
    });
}

async function loadComments(pid) {
    const list = document.getElementById(`list-${pid}`);
    if(!list) return;

    // Remove botão "Ver mais" antigo se existir
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

        // Ordena por data (mais recente primeiro)
        data.sort((a, b) => new Date(b.timestamp + 'Z') - new Date(a.timestamp + 'Z'));

        const COMMENT_LIMIT = 3; // Limite de visualização inicial dos comentários
        
        data.forEach((c, i) => {
            const date = new Date(c.timestamp + 'Z').toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
            const li = document.createElement('li');
            li.className = 'comment-item';
            
            if (i >= COMMENT_LIMIT) { 
                li.style.display = 'none'; 
                li.classList.add('hidden'); 
            }
            
            li.innerHTML = `<span class="comment-author">@${c.username} <span class="comment-date">${date}</span></span> ${c.content}`;
            list.appendChild(li);
        });

        // Botão Ver Mais Logs
        if (data.length > COMMENT_LIMIT) {
            const remaining = data.length - COMMENT_LIMIT;
            const btn = document.createElement('button');
            btn.className = 'load-more-btn';
            let isExpanded = false;
            
            btn.innerHTML = `Ver ${remaining} logs antigos <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

            btn.onclick = () => {
                const hiddenItems = list.querySelectorAll('.hidden');
                if (!isExpanded) {
                    hiddenItems.forEach(l => {
                        l.style.display = 'flex';
                        l.style.animation = "slideDown 0.3s ease";
                    });
                    btn.innerHTML = `Ocultar logs antigos <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`;
                    isExpanded = true;
                } else {
                    hiddenItems.forEach(l => l.style.display = 'none');
                    btn.innerHTML = `Ver ${remaining} logs antigos <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
                    isExpanded = false;
                    list.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            };
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
    if (!val || !userSession.isLoggedIn) return;

    await fetch(`${API_BASE_URL}/comments`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ post_id: pid, username: userSession.username, content: val })
    });
    inp.value = "";
    loadComments(pid);
};