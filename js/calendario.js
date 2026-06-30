// ARQPASSAGEM Event Calendar 2026 - Core Logic
// Supports 12-month calendar, Brazilian holidays, localStorage cache, and Firebase Realtime Database Sync.

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB6O7qFDw73uHA45OGFb6uni-NVcOGvgTw",
  authDomain: "calendario-arqpassagem.firebaseapp.com",
  projectId: "calendario-arqpassagem",
  databaseURL: "https://calendario-arqpassagem-default-rtdb.firebaseio.com",
  storageBucket: "calendario-arqpassagem.firebasestorage.app",
  messagingSenderId: "250593887550",
  appId: "1:250593887550:web:9565297f24c97250b3186f",
  measurementId: "G-XCYDEJ7G0S"
};

let isFirebaseActive = false;
let dbRef = null;

if (typeof firebase !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== "SUA_API_KEY") {
  try {
    firebase.initializeApp(firebaseConfig);
    dbRef = firebase.database().ref("arq-events");
    isFirebaseActive = true;
    console.log("Firebase conectado com sucesso.");
  } catch (e) {
    console.error("Erro ao inicializar Firebase:", e);
  }
}

// Preloaded standard 2026 Brazilian holidays (plus Dia da Consciência Negra)
const nationalHolidays = {
  0: { // January
    1: { type: "feriado", title: "Ano Novo", desc: "Confraternização Universal - Feriado Nacional" }
  },
  1: { // February
    16: { type: "feriado", title: "Carnaval", desc: "Segunda-feira de Carnaval - Ponto Facultativo" },
    17: { type: "feriado", title: "Carnaval", desc: "Terça-feira de Carnaval - Ponto Facultativo" },
    18: { type: "feriado", title: "Cinzas", desc: "Quarta-feira de Cinzas - Ponto Facultativo" }
  },
  3: { // April
    3: { type: "feriado", title: "Sexta-feira Santa", desc: "Paixão de Cristo - Feriado Nacional" },
    21: { type: "feriado", title: "Tiradentes", desc: "Feriado Nacional" }
  },
  4: { // May
    1: { type: "feriado", title: "Dia do Trabalhador", desc: "Feriado Nacional" }
  },
  5: { // June
    4: { type: "feriado", title: "Corpus Christi", desc: "Feriado Nacional" }
  },
  8: { // September
    7: { type: "feriado", title: "Independência", desc: "Independência do Brasil - Feriado Nacional" }
  },
  9: { // October
    12: { type: "feriado", title: "Nsa. Sra. Aparecida", desc: "Padroeira do Brasil - Feriado Nacional" }
  },
  10: { // November
    2: { type: "feriado", title: "Finados", desc: "Feriado Nacional" },
    15: { type: "feriado", title: "Proclamação da República", desc: "Feriado Nacional" },
    20: { type: "feriado", title: "Consciência Negra", desc: "Dia Nacional de Zumbi e da Consciência Negra - Feriado Nacional" }
  },
  11: { // December
    25: { type: "feriado", title: "Natal", desc: "Feriado Nacional" }
  }
};

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// App State
let currentYear = 2026;
let currentMonthIndex = 0; // January
let activeView = "grid";
let selectedDay = null;

// SVG Icons for events
const eventIcons = {
  reuniao: `
    <svg class="event-icon" viewBox="0 0 24 24">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 8 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
    </svg>`,
  assembleia: `
    <svg class="event-icon" viewBox="0 0 24 24">
      <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5.89 12.55L12 15.89l6.11-3.34c-1.9-.99-4.32-1.55-6.11-1.55s-4.21.56-6.11 1.55zM12 17.9L5.89 14.56c-1.9.99-3.89 1.44-5.89 1.44v1c1.9 0 3.89-.45 5.89-1.44L12 18.9l6.11-3.34c2-.99 3.99-1.44 5.89-1.44v-1c-2 0-3.99.45-5.89 1.44L12 17.9z"/>
    </svg>`,
  mutirao: `
    <svg class="event-icon" viewBox="0 0 24 24">
      <path d="M7 22h2v-2H7v2zm4-6h2v-2h-2v2zm0 6h2v-2h-2v2zm-4-3h2v-2H7v2zm0-3h2v-2H7v2zm4 3h2v-2h-2v2zm8-6h-2v2h2v-2zm0 3h-2v2h2v-2zm-4-3h-2v2h2v-2zm0 3h-2v2h2v-2zm4 3h-2v2h2v-2zm-4 3h-2v2h2v-2zM5 2h14c1.1 0 2 .9 2 2v6H3V4c0-1.1.9-2 2-2zm0 4h14V4H5v2z"/>
    </svg>`,
  festividade: `
    <svg class="event-icon" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-6.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z"/>
    </svg>`,
  outro: `
    <svg class="event-icon" viewBox="0 0 24 24">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
    </svg>`,
  feriado: `
    <svg class="event-icon" viewBox="0 0 24 24">
      <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
    </svg>`
};

document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  
  if (isFirebaseActive) {
    // Escuta alterações em tempo real do banco de dados e sincroniza com cache local
    dbRef.on("value", (snapshot) => {
      const data = snapshot.val();
      syncFirebaseToLocalStorage(data);
      renderCurrentMonth();
    }, (error) => {
      console.error("Erro de leitura do Firebase:", error);
      renderCurrentMonth();
    });
  } else {
    renderCurrentMonth();
  }
});

// Helper functions for Firebase-LocalStorage synchronization
function syncFirebaseToLocalStorage(data) {
  clearLocalEvents();
  if (!data) return;

  for (const year in data) {
    for (const month in data[year]) {
      for (const day in data[year][month]) {
        const dayData = data[year][month][day];
        if (dayData) {
          const eventsArray = Object.values(dayData);
          localStorage.setItem(`arq-events-${year}-${month}-${day}`, JSON.stringify(eventsArray));
        }
      }
    }
  }
}

function clearLocalEvents() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("arq-events-")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

function setupEventListeners() {
  document.getElementById("btn-prev").addEventListener("click", navigatePrev);
  document.getElementById("btn-next").addEventListener("click", navigateNext);
  document.getElementById("btn-today").addEventListener("click", () => {
    const today = new Date();
    // Fallback if today isn't 2026, keep it in 2026 for demonstration, or set to current year
    currentYear = 2026;
    currentMonthIndex = today.getFullYear() === 2026 ? today.getMonth() : 0;
    renderCurrentMonth();
  });
  
  document.getElementById("btn-print").addEventListener("click", () => {
    window.print();
  });

  const toggleGrid = document.getElementById("toggle-grid");
  const toggleList = document.getElementById("toggle-list");

  toggleGrid.addEventListener("click", () => {
    if (activeView !== "grid") {
      activeView = "grid";
      toggleGrid.classList.add("active");
      toggleList.classList.remove("active");
      renderCurrentMonth();
    }
  });

  toggleList.addEventListener("click", () => {
    if (activeView !== "list") {
      activeView = "list";
      toggleList.classList.add("active");
      toggleGrid.classList.remove("active");
      renderCurrentMonth();
    }
  });

  // Modal actions
  document.getElementById("modal-close").addEventListener("click", closeModal);
  document.getElementById("btn-modal-cancel").addEventListener("click", closeModal);
  document.getElementById("btn-add-event-form").addEventListener("click", addCustomEvent);
}

// Calculate total events of each category in 2026 for the sidebar stats
function updateSidebarStats() {
  let countReuniao = 0;
  let countAssembleia = 0;
  let countMutirao = 0;
  let countFestividade = 0;

  // Search localStorage keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("arq-events-2026-")) {
      try {
        const events = JSON.parse(localStorage.getItem(key)) || [];
        events.forEach(evt => {
          if (evt.type === "reuniao") countReuniao++;
          if (evt.type === "assembleia") countAssembleia++;
          if (evt.type === "mutirao") countMutirao++;
          if (evt.type === "festividade") countFestividade++;
        });
      } catch (e) {
        console.error(e);
      }
    }
  }

  document.getElementById("stat-reuniao").textContent = countReuniao;
  document.getElementById("stat-assembleia").textContent = countAssembleia;
  document.getElementById("stat-mutirao").textContent = countMutirao;
  document.getElementById("stat-festividade").textContent = countFestividade;
}

// Month Navigation
function navigatePrev() {
  if (currentMonthIndex > 0) {
    currentMonthIndex--;
    renderCurrentMonth();
  }
}

function navigateNext() {
  if (currentMonthIndex < 11) {
    currentMonthIndex++;
    renderCurrentMonth();
  }
}

// Render dynamic month views
function renderCurrentMonth() {
  const monthName = monthNames[currentMonthIndex];
  
  // Update Header title
  document.getElementById("month-title").textContent = `${monthName} de ${currentYear}`;
  
  // Render Monthly Banner
  const bannerContainer = document.getElementById("monthly-banner-container");
  bannerContainer.className = "monthly-banner animate-fade";
  bannerContainer.innerHTML = `
    <div class="banner-pattern-top" style="background-image: url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%2228%22 viewBox=%220 0 100 28%22 fill=%22%23f4cb2b%22><path d=%22M12.5,2C6.6,2 2.5,6.1 2.5,12c0,5.9 4.1,10 10,10c5.9,0 10,-4.1 10,-10c0,-5.9 -4.1,-10 -10,-10zm0,16.5c-3.6,0 -6.5,-2.9 -6.5,-6.5c0,-3.6 2.9,-6.5 6.5,-6.5c3.6,0 6.5,2.9 6.5,6.5c0,3.6 -2.9,6.5 -6.5,6.5zm25,-16.5c-4.1,0 -7.5,3.4 -7.5,7.5c0,4.1 3.4,7.5 7.5,7.5c4.1,0 7.5,-3.4 7.5,-7.5c0,-4.1 -3.4,-7.5 -7.5,-7.5zm25,0c-5.9,0 -10,4.1 -10,10c0,5.9 4.1,10 10,10c5.9,0 10,-4.1 10,-10c0,-5.9 -4.1,-10 -10,-10zm0,16.5c-3.6,0 -6.5,-2.9 -6.5,-6.5c0,-3.6 2.9,-6.5 6.5,-6.5c3.6,0 6.5,2.9 6.5,6.5c0,3.6 -2.9,6.5 -6.5,6.5zm25,-16.5c-4.1,0 -7.5,3.4 -7.5,7.5c0,4.1 3.4,7.5 7.5,7.5c4.1,0 7.5,-3.4 7.5,-7.5c0,-4.1 -3.4,-7.5 -7.5,-7.5z%22/></svg>')"></div>
    <div class="banner-content">
      <span class="banner-year">${currentYear}</span>
      <h2 class="banner-month-name">${monthName}</h2>
      <span class="banner-subtitle">ARQPASSAGEM</span>
    </div>
    <p class="banner-footnote">*Planejamento anual de reuniões, mutirões, assembleias e comemorações da comunidade.</p>
  `;

  // Render main panel content
  const contentArea = document.getElementById("calendar-content-area");
  contentArea.innerHTML = "";

  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const startOffset = new Date(currentYear, currentMonthIndex, 1).getDay(); // Sunday=0, Monday=1, ...

  if (activeView === "grid") {
    renderGridView(contentArea, daysInMonth, startOffset);
  } else {
    renderListView(contentArea, daysInMonth);
  }

  // Update nav buttons states
  document.getElementById("btn-prev").disabled = (currentMonthIndex === 0);
  document.getElementById("btn-next").disabled = (currentMonthIndex === 11);
  
  updateSidebarStats();
}

// Get combined list of events for a specific day (preloaded holidays + custom user events)
function getDayEvents(day) {
  const events = [];

  // 1. Check holidays
  if (nationalHolidays[currentMonthIndex] && nationalHolidays[currentMonthIndex][day]) {
    events.push(nationalHolidays[currentMonthIndex][day]);
  }

  // 2. Check custom local storage events
  const customEventsKey = `arq-events-${currentYear}-${currentMonthIndex}-${day}`;
  const customEvents = JSON.parse(localStorage.getItem(customEventsKey)) || [];
  
  return events.concat(customEvents);
}

// Render Grid Calendar View
function renderGridView(container, daysInMonth, startOffset) {
  const gridWrapper = document.createElement("div");
  gridWrapper.className = "calendar-grid animate-fade";

  // Weekdays (DOM to SAB)
  const weekdays = [
    { full: "DOM", short: "D" },
    { full: "SEG", short: "S" },
    { full: "TER", short: "T" },
    { full: "QUA", short: "Q" },
    { full: "QUI", short: "Q" },
    { full: "SEX", short: "S" },
    { full: "SAB", short: "S" }
  ];
  weekdays.forEach((day, index) => {
    const header = document.createElement("div");
    header.className = `weekday-header${index === 0 ? ' sunday' : ''}`;
    header.innerHTML = `
      <span class="header-full">${day.full}</span>
      <span class="header-short">${day.short}</span>
    `;
    gridWrapper.appendChild(header);
  });

  // Start padding cells
  for (let i = 0; i < startOffset; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "date-cell empty";
    gridWrapper.appendChild(emptyCell);
  }

  // Active day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const isSunday = (startOffset + day - 1) % 7 === 0;

    const cell = document.createElement("div");
    cell.className = `date-cell${isSunday ? ' sunday-cell' : ''}`;
    cell.dataset.day = day;
    cell.addEventListener("click", () => openDayDetail(day));

    // Date header
    const numberContainer = document.createElement("div");
    numberContainer.className = "date-number-container";

    const number = document.createElement("div");
    number.className = "date-number";
    number.textContent = day < 10 ? `0${day}` : day;
    numberContainer.appendChild(number);
    cell.appendChild(numberContainer);

    // Event container
    const eventContainer = document.createElement("div");
    eventContainer.className = "event-container";

    // Load events
    const dayEvents = getDayEvents(day);
    dayEvents.forEach(evt => {
      const card = document.createElement("div");
      card.className = `event-card event-${evt.type}`;
      card.title = `${evt.title} - ${evt.desc}`;
      card.innerHTML = `
        ${eventIcons[evt.type] || ''}
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${evt.title}</span>
      `;
      eventContainer.appendChild(card);
    });

    cell.appendChild(eventContainer);
    gridWrapper.appendChild(cell);
  }

  container.appendChild(gridWrapper);
}

// Render List View
function renderListView(container, daysInMonth) {
  const listWrapper = document.createElement("div");
  listWrapper.className = "list-view animate-fade";

  const weekdaysMap = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  let hasEvents = false;

  for (let day = 1; day <= daysInMonth; day++) {
    const tempDate = new Date(currentYear, currentMonthIndex, day);
    const dayOfWeek = weekdaysMap[tempDate.getDay()];
    const dayEvents = getDayEvents(day);

    if (dayEvents.length > 0) {
      hasEvents = true;

      dayEvents.forEach(evt => {
        const item = document.createElement("div");
        item.className = "list-item";
        item.addEventListener("click", () => openDayDetail(day));

        // Date Badge
        const dateBadge = document.createElement("div");
        dateBadge.className = "list-date-badge";
        dateBadge.innerHTML = `
          <span class="list-date-num">${day < 10 ? '0' + day : day}</span>
          <span class="list-date-day">${dayOfWeek}</span>
        `;
        item.appendChild(dateBadge);

        // Content
        const content = document.createElement("div");
        content.className = "list-item-content";
        
        let typeLabel = "Evento";
        let typeColor = "#555";
        
        if (evt.type === "reuniao") { typeLabel = "Reunião"; typeColor = "var(--color-maroon)"; }
        else if (evt.type === "assembleia") { typeLabel = "Assembleia"; typeColor = "var(--color-orange)"; }
        else if (evt.type === "mutirao") { typeLabel = "Mutirão"; typeColor = "var(--color-green)"; }
        else if (evt.type === "festividade") { typeLabel = "Festividade"; typeColor = "var(--color-gold-dark)"; }
        else if (evt.type === "feriado") { typeLabel = "Feriado"; typeColor = "#777"; }
        
        content.innerHTML = `
          <div class="list-item-title-box">
            <h4 class="list-item-title">${evt.title}</h4>
            <span class="list-item-tag" style="background-color: ${typeColor}; color: #fff;">${typeLabel}</span>
          </div>
          <p class="list-item-desc">${evt.desc}</p>
        `;
        item.appendChild(content);
        listWrapper.appendChild(item);
      });
    }
  }

  if (!hasEvents) {
    const noEvents = document.createElement("div");
    noEvents.style.textAlign = "center";
    noEvents.style.padding = "3rem 1rem";
    noEvents.style.color = "var(--color-text-light)";
    noEvents.innerHTML = `
      <p style="font-size: 1.1rem; font-weight: 600;">Nenhum evento registrado para este mês.</p>
      <p style="font-size: 0.88rem; margin-top: 5px;">Clique em qualquer dia do calendário para registrar compromissos e atividades.</p>
    `;
    listWrapper.appendChild(noEvents);
  }

  container.appendChild(listWrapper);
}

// Open Day Details Modal
function openDayDetail(day) {
  selectedDay = day;
  const monthName = monthNames[currentMonthIndex];
  
  // Set date headers
  document.getElementById("modal-date").textContent = `${day} de ${monthName} de ${currentYear}`;
  
  // Render list of current events
  renderModalEvents();

  // Reset Add Form inputs
  document.getElementById("form-event-title").value = "";
  document.getElementById("form-event-type").value = "reuniao";
  document.getElementById("form-event-desc").value = "";

  // Open overlay
  const modal = document.getElementById("modal-overlay");
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// Close Modal
function closeModal() {
  const modal = document.getElementById("modal-overlay");
  modal.classList.remove("active");
  document.body.style.overflow = "";
  selectedDay = null;
}

// Render events inside the modal
function renderModalEvents() {
  const listContainer = document.getElementById("modal-events-list-container");
  listContainer.innerHTML = "";

  const dayEvents = getDayEvents(selectedDay);

  if (dayEvents.length === 0) {
    listContainer.innerHTML = `
      <p style="font-size: 0.88rem; color: var(--color-text-light); font-style: italic;">
        Nenhum evento agendado para este dia. Use o formulário abaixo para adicionar uma atividade.
      </p>
    `;
    return;
  }

  dayEvents.forEach((evt, index) => {
    const item = document.createElement("div");
    item.className = `modal-event-item ${evt.type}`;
    
    // Add delete button only if it is NOT a holiday (national holidays cannot be deleted)
    const isHoliday = evt.type === "feriado";
    
    item.innerHTML = `
      <h5 class="modal-event-item-title">${evt.title}</h5>
      <p class="modal-event-item-desc">${evt.desc}</p>
      ${!isHoliday ? `
        <button class="btn-delete-evt" data-id="${evt.id}" title="Deletar este evento">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      ` : ''}
    `;

    if (!isHoliday) {
      item.querySelector(".btn-delete-evt").addEventListener("click", () => deleteCustomEvent(evt.id));
    }

    listContainer.appendChild(item);
  });
}

// Add Custom Event
function addCustomEvent(e) {
  e.preventDefault();

  if (selectedDay === null) return;

  const titleInput = document.getElementById("form-event-title");
  const typeSelect = document.getElementById("form-event-type");
  const descInput = document.getElementById("form-event-desc");

  const title = titleInput.value.trim();
  const type = typeSelect.value;
  const desc = descInput.value.trim();

  if (title === "") {
    alert("Por favor, digite o título do evento.");
    titleInput.focus();
    return;
  }

  const customEventsKey = `arq-events-${currentYear}-${currentMonthIndex}-${selectedDay}`;
  const customEvents = JSON.parse(localStorage.getItem(customEventsKey)) || [];

  const newEvent = {
    id: Date.now().toString(), // local fallback id
    type: type,
    title: title,
    desc: desc || "Nenhuma descrição detalhada fornecida."
  };

  if (isFirebaseActive) {
    const dayRef = dbRef.child(`${currentYear}/${currentMonthIndex}/${selectedDay}`);
    const newEventRef = dayRef.push();
    newEvent.id = newEventRef.key;
    newEventRef.set(newEvent)
      .then(() => {
        closeModal();
      })
      .catch(err => {
        console.error("Erro ao salvar no Firebase:", err);
        alert("Erro de conexão ao banco de dados online. O evento foi salvo localmente temporariamente.");
        saveLocalFallback(customEventsKey, customEvents, newEvent);
      });
  } else {
    saveLocalFallback(customEventsKey, customEvents, newEvent);
  }

  // Reset inputs
  titleInput.value = "";
  descInput.value = "";
}

function saveLocalFallback(key, list, item) {
  list.push(item);
  localStorage.setItem(key, JSON.stringify(list));
  closeModal();
  renderCurrentMonth();
}

// Delete Custom Event
function deleteCustomEvent(eventId) {
  if (selectedDay === null) return;

  if (isFirebaseActive) {
    dbRef.child(`${currentYear}/${currentMonthIndex}/${selectedDay}/${eventId}`).remove()
      .then(() => {
        renderModalEvents();
      })
      .catch(err => {
        console.error("Erro ao deletar no Firebase:", err);
        alert("Erro de conexão. Deletando localmente.");
        deleteLocalFallback(eventId);
      });
  } else {
    deleteLocalFallback(eventId);
  }
}

function deleteLocalFallback(eventId) {
  const customEventsKey = `arq-events-${currentYear}-${currentMonthIndex}-${selectedDay}`;
  let customEvents = JSON.parse(localStorage.getItem(customEventsKey)) || [];
  customEvents = customEvents.filter(evt => evt.id !== eventId);

  if (customEvents.length === 0) {
    localStorage.removeItem(customEventsKey);
  } else {
    localStorage.setItem(customEventsKey, JSON.stringify(customEvents));
  }

  renderModalEvents();
  renderCurrentMonth();
}
