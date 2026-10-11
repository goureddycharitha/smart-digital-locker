/**
 * SMART DIGITAL LOCKER - FRONTEND APPLICATION CONTROLLER
 */

document.addEventListener('DOMContentLoaded', () => {
  // App State
  const state = {
    user: getStoredUser(),
    documents: [],
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    searchQuery: '',
    categoryFilter: '',
    selectedUploadFile: null,
    activeDocument: null,
    activeDocumentIdToDelete: null
  };

  // UI Element References
  const views = {
    landing: document.getElementById('landing-view'),
    app: document.getElementById('app-view'),
    authModal: document.getElementById('auth-modal'),
    uploadModal: document.getElementById('upload-modal'),
    editModal: document.getElementById('edit-modal'),
    detailsModal: document.getElementById('details-modal'),
    deleteModal: document.getElementById('delete-modal'),
    demoModal: document.getElementById('demo-modal')
  };

  const subviews = {
    dashboard: document.getElementById('subview-dashboard'),
    documents: document.getElementById('subview-documents'),
    profile: document.getElementById('subview-profile')
  };

  // ==========================================
  // TOAST NOTIFICATION SYSTEM
  // ==========================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getFileCategoryIcon(category, mimeType) {
    if (category === 'Education' || category === 'Academics') return { icon: 'fa-graduation-cap', class: 'pdf' };
    if (category === 'Identity') return { icon: 'fa-id-card', class: 'img' };
    if (category === 'Financial') return { icon: 'fa-receipt', class: 'docx' };
    if (mimeType && mimeType.includes('pdf')) return { icon: 'fa-file-pdf', class: 'pdf' };
    if (mimeType && mimeType.includes('image')) return { icon: 'fa-file-image', class: 'img' };
    if (mimeType && mimeType.includes('word')) return { icon: 'fa-file-word', class: 'docx' };
    return { icon: 'fa-file-lines', class: 'pdf' };
  }

  // ==========================================
  // NAVIGATION & VIEW SWITCHING
  // ==========================================
  function initNavigation() {
    if (isLoggedIn()) {
      showAppView();
    } else {
      showLandingView();
    }

    // Landing Page Buttons
    document.getElementById('nav-login-btn')?.addEventListener('click', () => openAuthModal('login'));
    document.getElementById('nav-register-btn')?.addEventListener('click', () => openAuthModal('register'));
    document.getElementById('hero-get-started-btn')?.addEventListener('click', () => openAuthModal('register'));
    document.getElementById('section-register-btn')?.addEventListener('click', () => openAuthModal('register'));
    document.getElementById('section-login-btn')?.addEventListener('click', () => openAuthModal('login'));
    document.getElementById('switch-to-register-btn')?.addEventListener('click', () => switchAuthTab('register'));
    document.getElementById('switch-to-login-btn')?.addEventListener('click', () => switchAuthTab('login'));
    document.getElementById('hero-demo-btn')?.addEventListener('click', () => {
      views.demoModal?.classList.remove('hidden');
    });
    document.getElementById('demo-modal-close')?.addEventListener('click', () => views.demoModal?.classList.add('hidden'));
    document.getElementById('demo-close-btn')?.addEventListener('click', () => views.demoModal?.classList.add('hidden'));
    document.getElementById('demo-start-btn')?.addEventListener('click', () => {
      views.demoModal?.classList.add('hidden');
      openAuthModal('register');
    });

    // Sidebar Items
    document.getElementById('nav-item-dashboard')?.addEventListener('click', () => switchSubview('dashboard'));
    document.getElementById('nav-item-documents')?.addEventListener('click', () => switchSubview('documents'));
    document.getElementById('nav-item-profile')?.addEventListener('click', () => switchSubview('profile'));
    document.getElementById('sidebar-logout-btn')?.addEventListener('click', handleLogout);

    // Dashboard Quick Actions
    document.getElementById('dash-upload-btn')?.addEventListener('click', openUploadModal);
    document.getElementById('quick-upload-header-btn')?.addEventListener('click', openUploadModal);
    document.getElementById('view-all-docs-btn')?.addEventListener('click', () => switchSubview('documents'));
    document.getElementById('doc-upload-main-btn')?.addEventListener('click', openUploadModal);

    // Mobile Menu Toggle
    document.getElementById('mobile-menu-toggle')?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('open');
    });

    // Handle Unauthorized Session Event
    window.addEventListener('unauthorized-session', () => {
      showToast('Your session has expired. Please log in again.', 'warning');
      handleLogout(true);
    });
  }

  function showLandingView() {
    views.landing.classList.remove('hidden');
    views.app.classList.add('hidden');
    closeAllModals();
  }

  function showAppView() {
    views.landing.classList.add('hidden');
    views.app.classList.remove('hidden');
    closeAllModals();
    updateUserProfileBadge();
    switchSubview('dashboard');
  }

  function switchSubview(targetName) {
    Object.keys(subviews).forEach(key => {
      if (key === targetName) {
        subviews[key].classList.remove('hidden');
        subviews[key].classList.add('active');
      } else {
        subviews[key].classList.add('hidden');
        subviews[key].classList.remove('active');
      }
    });

    // Update Sidebar Active state
    document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`nav-item-${targetName}`)?.classList.add('active');

    // Update Topbar Heading
    const pageHeading = document.getElementById('page-heading');
    if (pageHeading) {
      if (targetName === 'dashboard') pageHeading.textContent = 'Dashboard';
      if (targetName === 'documents') pageHeading.textContent = 'My Documents';
      if (targetName === 'profile') pageHeading.textContent = 'Account Settings';
    }

    // Close Mobile Sidebar if open
    document.querySelector('.sidebar')?.classList.remove('open');

    // Load Data for subview
    if (targetName === 'dashboard') loadDashboardData();
    if (targetName === 'documents') loadDocumentsData();
    if (targetName === 'profile') loadProfileData();
  }

  function updateUserProfileBadge() {
    state.user = getStoredUser();
    if (!state.user) return;

    const displayName = state.user.fullName || state.user.email || 'User';
    const initial = displayName.charAt(0).toUpperCase();

    document.getElementById('user-avatar-text').textContent = initial;
    document.getElementById('user-display-name').textContent = displayName;
    document.getElementById('user-display-email').textContent = state.user.email || '';
    document.getElementById('welcome-user-name').textContent = displayName;
  }

  function handleLogout(quiet = false) {
    clearAuthToken();
    state.user = null;
    state.documents = [];
    if (!quiet) {
      showToast('Logged out successfully.', 'info');
    }
    showLandingView();
  }

  // ==========================================
  // AUTHENTICATION MODAL & FORMS
  // ==========================================
  function openAuthModal(tab = 'login') {
    views.authModal.classList.remove('hidden');
    switchAuthTab(tab);
  }

  function switchAuthTab(tab) {
    const loginTab = document.getElementById('tab-login-btn');
    const registerTab = document.getElementById('tab-register-btn');
    const loginView = document.getElementById('login-form-container');
    const registerView = document.getElementById('register-form-container');

    if (tab === 'login') {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginView.classList.remove('hidden');
      registerView.classList.add('hidden');
    } else {
      registerTab.classList.add('active');
      loginTab.classList.remove('active');
      registerView.classList.remove('hidden');
      loginView.classList.add('hidden');
    }
    clearAuthErrors();
  }

  document.getElementById('tab-login-btn')?.addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('tab-register-btn')?.addEventListener('click', () => switchAuthTab('register'));
  document.getElementById('auth-modal-close')?.addEventListener('click', () => views.authModal.classList.add('hidden'));

  // Toggle Password Visibility
  document.querySelectorAll('.toggle-pw-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fa-solid fa-eye-slash';
      } else {
        input.type = 'password';
        icon.className = 'fa-solid fa-eye';
      }
    });
  });

  function clearAuthErrors() {
    document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
    document.querySelectorAll('.form-alert').forEach(el => {
      el.textContent = '';
      el.className = 'form-alert hidden';
    });
  }

  // Handle Login Submission
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthErrors();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    let valid = true;
    if (!email) {
      document.getElementById('error-login-email').textContent = 'Email address is required.';
      valid = false;
    }
    if (!password) {
      document.getElementById('error-login-password').textContent = 'Password is required.';
      valid = false;
    }
    if (!valid) return;

    const submitBtn = document.getElementById('login-submit-btn');
    setButtonLoading(submitBtn, true);

    try {
      const result = await Api.login({ email, password });
      showToast('Login successful! Welcome back.', 'success');
      views.authModal.classList.add('hidden');
      showAppView();
    } catch (err) {
      const alertEl = document.getElementById('login-alert');
      alertEl.textContent = err.message || 'Login failed.';
      alertEl.className = 'form-alert alert-danger';
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  // Handle Register Submission
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthErrors();

    const fullName = document.getElementById('reg-fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirmPw = document.getElementById('reg-confirm-password').value;

    let valid = true;
    if (!fullName || fullName.length < 2) {
      document.getElementById('error-reg-fullname').textContent = 'Full name must be at least 2 characters.';
      valid = false;
    }
    if (!email || !email.includes('@')) {
      document.getElementById('error-reg-email').textContent = 'Valid email address is required.';
      valid = false;
    }
    if (!password || password.length < 8) {
      document.getElementById('error-reg-password').textContent = 'Password must be at least 8 characters long.';
      valid = false;
    }
    if (password !== confirmPw) {
      document.getElementById('error-reg-confirm-password').textContent = 'Passwords do not match.';
      valid = false;
    }
    if (!valid) return;

    const submitBtn = document.getElementById('register-submit-btn');
    setButtonLoading(submitBtn, true);

    try {
      await Api.register({ fullName, email, password });
      showToast('Registration successful! Logging you in...', 'success');
      // Auto login after registration
      await Api.login({ email, password });
      views.authModal.classList.add('hidden');
      showAppView();
    } catch (err) {
      const alertEl = document.getElementById('register-alert');
      alertEl.textContent = err.message || 'Registration failed.';
      alertEl.className = 'form-alert alert-danger';
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  function setButtonLoading(btn, isLoading) {
    if (!btn) return;
    const textEl = btn.querySelector('.btn-text');
    const spinnerEl = btn.querySelector('.btn-spinner');
    if (isLoading) {
      btn.disabled = true;
      if (textEl) textEl.classList.add('hidden');
      if (spinnerEl) spinnerEl.classList.remove('hidden');
    } else {
      btn.disabled = false;
      if (textEl) textEl.classList.remove('hidden');
      if (spinnerEl) spinnerEl.classList.add('hidden');
    }
  }

  // ==========================================
  // DASHBOARD DATA & RECENT DOCUMENTS
  // ==========================================
  async function loadDashboardData() {
    const loadingEl = document.getElementById('dash-recent-loading');
    const listEl = document.getElementById('dash-recent-list');
    
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (listEl) listEl.innerHTML = '';

    try {
      const res = await Api.getDocuments({ page: 1, limit: 5 });
      const docs = res.documents || [];
      const total = res.pagination ? res.pagination.total : docs.length;

      // Calculate Storage Used across all user documents
      const totalBytes = res.pagination && res.pagination.totalBytes !== undefined
        ? res.pagination.totalBytes
        : docs.reduce((acc, doc) => acc + (doc.fileSize || 0), 0);
      const storageUsedFormatted = formatBytes(totalBytes);

      // Calculate Categories across all user documents
      const categoriesCount = res.pagination && res.pagination.categoriesCount !== undefined
        ? res.pagination.categoriesCount
        : new Set(docs.map(d => d.category)).size;

      // Update Stat Cards
      document.getElementById('stat-total-docs').textContent = total;
      document.getElementById('stat-storage-used').textContent = storageUsedFormatted;
      document.getElementById('stat-categories-count').textContent = categoriesCount;
      document.getElementById('stat-recent-upload').textContent = docs.length > 0 ? formatDate(docs[0].uploadedAt) : 'None';

      // Render Recent List
      if (docs.length === 0) {
        listEl.innerHTML = `
          <div class="empty-state">
            <i class="fa-solid fa-folder-open empty-icon"></i>
            <h4 class="empty-title">Your locker is empty</h4>
            <p class="empty-desc">Upload your first document to store it securely in your digital locker.</p>
            <button class="btn btn-primary btn-sm" onclick="document.getElementById('dash-upload-btn').click()">
              <i class="fa-solid fa-plus"></i> Upload Document
            </button>
          </div>
        `;
      } else {
        listEl.innerHTML = docs.map(doc => {
          const typeIcon = getFileCategoryIcon(doc.category, doc.mimeType);
          return `
            <div class="doc-preview-item" data-id="${doc.id}" style="cursor: pointer;">
              <div class="doc-icon ${typeIcon.class}">
                <i class="fa-solid ${typeIcon.icon}"></i>
              </div>
              <div class="doc-info">
                <span class="doc-name">${escapeHtml(doc.title)}</span>
                <span class="doc-meta">${escapeHtml(doc.originalFileName)} • ${formatBytes(doc.fileSize)} • ${escapeHtml(doc.category)}</span>
              </div>
              <button class="btn btn-sm btn-outline download-btn" data-id="${doc.id}">
                <i class="fa-solid fa-download"></i> Download
              </button>
            </div>
          `;
        }).join('');

        // Attach item click for details and download button listener
        listEl.querySelectorAll('.doc-preview-item').forEach(item => {
          item.addEventListener('click', () => {
            const docId = item.getAttribute('data-id');
            openDetailsModal(docId);
          });
        });

        listEl.querySelectorAll('.download-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const docId = btn.getAttribute('data-id');
            handleDownloadDocument(docId);
          });
        });
      }
    } catch (err) {
      showToast(`Failed to load dashboard data: ${err.message}`, 'error');
    } finally {
      if (loadingEl) loadingEl.classList.add('hidden');
    }
  }

  // ==========================================
  // DOCUMENTS LISTING & FILTERING
  // ==========================================
  async function loadDocumentsData() {
    const loadingEl = document.getElementById('docs-loading');
    const errorEl = document.getElementById('docs-error');
    const container = document.getElementById('docs-container');

    loadingEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    container.innerHTML = '';

    try {
      const res = await Api.getDocuments({
        page: state.pagination.page,
        limit: state.pagination.limit,
        search: state.searchQuery,
        category: state.categoryFilter
      });

      state.documents = res.documents || [];
      state.pagination = res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

      renderDocumentsGrid();
      updatePaginationControls();
    } catch (err) {
      errorEl.classList.remove('hidden');
      document.getElementById('docs-error-message').textContent = err.message || 'Failed to fetch documents.';
    } finally {
      loadingEl.classList.add('hidden');
    }
  }

  function renderDocumentsGrid() {
    const container = document.getElementById('docs-container');
    const docs = state.documents;

    if (!docs || docs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-file-excel empty-icon"></i>
          <h4 class="empty-title">No documents found</h4>
          <p class="empty-desc">${state.searchQuery || state.categoryFilter ? 'No documents match your search or filter criteria.' : 'You have not uploaded any documents yet.'}</p>
          <button class="btn btn-primary" onclick="document.getElementById('doc-upload-main-btn').click()">
            <i class="fa-solid fa-plus"></i> Upload New Document
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = docs.map(doc => {
      const typeIcon = getFileCategoryIcon(doc.category, doc.mimeType);
      return `
        <div class="doc-card" data-id="${doc.id}">
          <div class="doc-card-top">
            <div class="doc-type-icon ${typeIcon.class}">
              <i class="fa-solid ${typeIcon.icon}"></i>
            </div>
            <span class="badge badge-primary">${escapeHtml(doc.category)}</span>
          </div>
          <div class="doc-card-body">
            <h4 class="doc-card-title">${escapeHtml(doc.title)}</h4>
            <p class="doc-card-filename"><i class="fa-solid fa-paperclip"></i> ${escapeHtml(doc.originalFileName)}</p>
          </div>
          <div class="doc-card-meta">
            <span><i class="fa-solid fa-hard-drive"></i> ${formatBytes(doc.fileSize)}</span>
            <span><i class="fa-solid fa-calendar"></i> ${formatDate(doc.uploadedAt)}</span>
          </div>
          <div class="doc-card-actions">
            <button class="btn btn-sm btn-outline view-doc-btn" data-id="${doc.id}" title="View Details">
              <i class="fa-solid fa-eye"></i> Details
            </button>
            <button class="btn btn-sm btn-primary download-doc-btn" data-id="${doc.id}" title="Download">
              <i class="fa-solid fa-download"></i> Download
            </button>
            <button class="btn btn-sm btn-outline edit-doc-btn" data-id="${doc.id}" title="Edit Metadata">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-doc-btn" data-id="${doc.id}" title="Delete">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach Event Listeners to Action Buttons
    container.querySelectorAll('.view-doc-btn').forEach(btn => {
      btn.addEventListener('click', () => openDetailsModal(btn.getAttribute('data-id')));
    });
    container.querySelectorAll('.download-doc-btn').forEach(btn => {
      btn.addEventListener('click', () => handleDownloadDocument(btn.getAttribute('data-id')));
    });
    container.querySelectorAll('.edit-doc-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.getAttribute('data-id')));
    });
    container.querySelectorAll('.delete-doc-btn').forEach(btn => {
      btn.addEventListener('click', () => openDeleteModal(btn.getAttribute('data-id')));
    });
  }

  function updatePaginationControls() {
    const { page, limit, total, totalPages } = state.pagination;
    const infoEl = document.getElementById('pagination-info-text');
    const pageNumEl = document.getElementById('pagination-page-num');
    const prevBtn = document.getElementById('pagination-prev');
    const nextBtn = document.getElementById('pagination-next');

    const start = total === 0 ? 0 : (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    if (infoEl) infoEl.textContent = `Showing ${start}-${end} of ${total} documents`;
    if (pageNumEl) pageNumEl.textContent = `Page ${page} of ${totalPages || 1}`;

    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;
  }

  // Search & Filter Listeners
  let searchTimeout = null;
  const searchInput = document.getElementById('doc-search-input');
  const clearSearchBtn = document.getElementById('doc-search-clear');
  const categorySelect = document.getElementById('doc-category-select');

  searchInput?.addEventListener('input', (e) => {
    const val = e.target.value;
    clearSearchBtn?.classList.toggle('hidden', !val);

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = val.trim();
      state.pagination.page = 1;
      loadDocumentsData();
    }, 300);
  });

  clearSearchBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    clearSearchBtn.classList.add('hidden');
    state.searchQuery = '';
    state.pagination.page = 1;
    loadDocumentsData();
  });

  categorySelect?.addEventListener('change', (e) => {
    state.categoryFilter = e.target.value;
    state.pagination.page = 1;
    loadDocumentsData();
  });

  document.getElementById('doc-refresh-btn')?.addEventListener('click', () => loadDocumentsData());
  document.getElementById('docs-retry-btn')?.addEventListener('click', () => loadDocumentsData());

  document.getElementById('pagination-prev')?.addEventListener('click', () => {
    if (state.pagination.page > 1) {
      state.pagination.page--;
      loadDocumentsData();
    }
  });

  document.getElementById('pagination-next')?.addEventListener('click', () => {
    if (state.pagination.page < state.pagination.totalPages) {
      state.pagination.page++;
      loadDocumentsData();
    }
  });

  // ==========================================
  // DOCUMENT UPLOAD MODAL & HANDLERS
  // ==========================================
  function openUploadModal() {
    views.uploadModal.classList.remove('hidden');
    resetUploadForm();
  }

  function resetUploadForm() {
    state.selectedUploadFile = null;
    const form = document.getElementById('upload-form');
    if (form) form.reset();

    document.getElementById('selected-file-info')?.classList.add('hidden');
    document.getElementById('drop-zone')?.classList.remove('hidden');
    document.getElementById('upload-submit-btn').disabled = true;
  }

  document.getElementById('upload-modal-close')?.addEventListener('click', () => views.uploadModal.classList.add('hidden'));
  document.getElementById('upload-cancel-btn')?.addEventListener('click', () => views.uploadModal.classList.add('hidden'));

  // Drag and Drop Zone Event Handlers
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  dropZone?.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('dragover');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('dragover');
    });
  });

  dropZone?.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleSelectedFile(files[0]);
    }
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  document.getElementById('remove-selected-file')?.addEventListener('click', () => {
    resetUploadForm();
  });

  function handleSelectedFile(file) {
    const maxBytes = 10 * 1024 * 1024; // 10MB
    const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.txt', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedExts.includes(ext)) {
      showToast(`Unsupported file format '${ext}'. Allowed formats: PDF, PNG, JPG, TXT, DOCX.`, 'error');
      return;
    }

    if (file.size > maxBytes) {
      showToast('File size exceeds the 10 MB limit.', 'error');
      return;
    }

    state.selectedUploadFile = file;

    // Display File Card Info
    document.getElementById('selected-file-name').textContent = file.name;
    document.getElementById('selected-file-size').textContent = formatBytes(file.size);

    // Auto-fill Title if empty
    const titleInput = document.getElementById('upload-title');
    if (titleInput && !titleInput.value) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      titleInput.value = nameWithoutExt.replace(/[_-]/g, ' ');
    }

    document.getElementById('drop-zone')?.classList.add('hidden');
    document.getElementById('selected-file-info')?.classList.remove('hidden');
    document.getElementById('upload-submit-btn').disabled = false;
  }

  // Upload Form Submission
  document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!state.selectedUploadFile) {
      showToast('Please select a file to upload.', 'warning');
      return;
    }

    const title = document.getElementById('upload-title').value.trim();
    const category = document.getElementById('upload-category').value;
    const description = document.getElementById('upload-description').value.trim();

    if (!title || !category) {
      showToast('Title and Category are required.', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', state.selectedUploadFile);
    formData.append('title', title);
    formData.append('category', category);
    if (description) formData.append('description', description);

    const submitBtn = document.getElementById('upload-submit-btn');
    setButtonLoading(submitBtn, true);

    try {
      const res = await Api.uploadDocument(formData);
      showToast('Document uploaded successfully!', 'success');
      views.uploadModal.classList.add('hidden');

      // Refresh Views
      if (!subviews.dashboard.classList.contains('hidden')) loadDashboardData();
      if (!subviews.documents.classList.contains('hidden')) loadDocumentsData();
    } catch (err) {
      showToast(`Upload failed: ${err.message}`, 'error');
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  // ==========================================
  // DOCUMENT DOWNLOAD HANDLER
  // ==========================================
  async function handleDownloadDocument(id) {
    try {
      showToast('Preparing download...', 'info');
      const res = await Api.downloadDocument(id);
      showToast(`Downloaded '${res.filename}' successfully!`, 'success');
    } catch (err) {
      showToast(`Download failed: ${err.message}`, 'error');
    }
  }

  // ==========================================
  // DOCUMENT DETAILS MODAL
  // ==========================================
  async function openDetailsModal(id) {
    try {
      const res = await Api.getDocumentById(id);
      const doc = res.document;
      state.activeDocument = doc;

      document.getElementById('detail-title').textContent = doc.title;
      document.getElementById('detail-category').textContent = doc.category;
      document.getElementById('detail-filename').textContent = doc.originalFileName;
      document.getElementById('detail-mime').textContent = doc.mimeType;
      document.getElementById('detail-size').textContent = formatBytes(doc.fileSize);
      document.getElementById('detail-uploaded').textContent = formatDate(doc.uploadedAt);
      document.getElementById('detail-description').textContent = doc.description || 'None';

      views.detailsModal.classList.remove('hidden');
    } catch (err) {
      showToast(`Failed to load details: ${err.message}`, 'error');
    }
  }

  document.getElementById('details-modal-close')?.addEventListener('click', () => views.detailsModal.classList.add('hidden'));
  document.getElementById('details-close-btn')?.addEventListener('click', () => views.detailsModal.classList.add('hidden'));
  document.getElementById('details-download-btn')?.addEventListener('click', () => {
    if (state.activeDocument) handleDownloadDocument(state.activeDocument.id);
  });

  // ==========================================
  // DOCUMENT EDIT MODAL
  // ==========================================
  async function openEditModal(id) {
    try {
      const res = await Api.getDocumentById(id);
      const doc = res.document;

      document.getElementById('edit-doc-id').value = doc.id;
      document.getElementById('edit-title').value = doc.title;
      document.getElementById('edit-category').value = doc.category;
      document.getElementById('edit-description').value = doc.description || '';

      views.editModal.classList.remove('hidden');
    } catch (err) {
      showToast(`Failed to load document for edit: ${err.message}`, 'error');
    }
  }

  document.getElementById('edit-modal-close')?.addEventListener('click', () => views.editModal.classList.add('hidden'));
  document.getElementById('edit-cancel-btn')?.addEventListener('click', () => views.editModal.classList.add('hidden'));

  document.getElementById('edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-doc-id').value;
    const title = document.getElementById('edit-title').value.trim();
    const category = document.getElementById('edit-category').value;
    const description = document.getElementById('edit-description').value.trim();

    const submitBtn = document.getElementById('edit-submit-btn');
    setButtonLoading(submitBtn, true);

    try {
      await Api.updateDocument(id, { title, category, description });
      showToast('Document metadata updated successfully!', 'success');
      views.editModal.classList.add('hidden');
      loadDocumentsData();
    } catch (err) {
      showToast(`Update failed: ${err.message}`, 'error');
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  // ==========================================
  // DOCUMENT DELETE MODAL
  // ==========================================
  function openDeleteModal(id) {
    const doc = state.documents.find(d => String(d.id) === String(id));
    state.activeDocumentIdToDelete = id;

    const nameEl = document.getElementById('delete-doc-name');
    if (nameEl) nameEl.textContent = doc ? `'${doc.title}'` : 'this document';

    views.deleteModal.classList.remove('hidden');
  }

  document.getElementById('delete-modal-close')?.addEventListener('click', () => views.deleteModal.classList.add('hidden'));
  document.getElementById('delete-cancel-btn')?.addEventListener('click', () => views.deleteModal.classList.add('hidden'));

  document.getElementById('delete-confirm-btn')?.addEventListener('click', async () => {
    const id = state.activeDocumentIdToDelete;
    if (!id) return;

    try {
      await Api.deleteDocument(id);
      showToast('Document deleted successfully.', 'success');
      views.deleteModal.classList.add('hidden');

      if (!subviews.dashboard.classList.contains('hidden')) loadDashboardData();
      if (!subviews.documents.classList.contains('hidden')) loadDocumentsData();
    } catch (err) {
      showToast(`Delete failed: ${err.message}`, 'error');
    }
  });

  // ==========================================
  // USER PROFILE & PASSWORD CHANGE
  // ==========================================
  async function loadProfileData() {
    try {
      const res = await Api.getCurrentUser();
      const user = res.user;

      document.getElementById('prof-fullname').value = user.fullName || '';
      document.getElementById('prof-email').value = user.email || '';
    } catch (err) {
      showToast(`Failed to load profile: ${err.message}`, 'error');
    }
  }

  document.getElementById('profile-update-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('prof-fullname').value.trim();

    if (!fullName || fullName.length < 2) {
      showToast('Full name must be at least 2 characters.', 'warning');
      return;
    }

    const submitBtn = document.getElementById('profile-save-btn');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const res = await Api.updateProfile({ fullName });
      showToast('Profile updated successfully!', 'success');
      updateUserProfileBadge();
    } catch (err) {
      showToast(`Profile update failed: ${err.message}`, 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.getElementById('change-pw-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('pw-current').value;
    const newPassword = document.getElementById('pw-new').value;

    if (!currentPassword || !newPassword) {
      showToast('Both current and new passwords are required.', 'warning');
      return;
    }
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters.', 'warning');
      return;
    }

    const submitBtn = document.getElementById('change-pw-btn');
    if (submitBtn) submitBtn.disabled = true;

    try {
      await Api.changePassword({ currentPassword, newPassword });
      showToast('Password changed successfully!', 'success');
      document.getElementById('change-pw-form').reset();
    } catch (err) {
      showToast(`Password change failed: ${err.message}`, 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  function closeAllModals() {
    Object.values(views).forEach(modal => {
      if (modal && modal.classList.contains('modal-overlay')) {
        modal.classList.add('hidden');
      }
    });
  }

  // Close modals when clicking directly on backdrop overlay (outside modal-card)
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // Initialize App
  initNavigation();
});
