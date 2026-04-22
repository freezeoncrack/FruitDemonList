const statusEl = document.getElementById('status');
const container = document.getElementById('demon-list');

let currentData = { levels: [] };
let livePin = null;
let editorUnlocked = false;
let listRef = null;
let hasSeedAttempted = false;

const editorButton = document.getElementById('editor-button');
const editorModal = document.getElementById('editor-modal');
const pinInput = document.getElementById('pin-input');
const pinSubmit = document.getElementById('pin-submit');
const pinCancel = document.getElementById('pin-cancel');
const editorPanel = document.getElementById('editor-panel');
const editorClose = document.getElementById('editor-close');
const editorList = document.getElementById('editor-list');
const addEntryBtn = document.getElementById('add-entry');

function setStatus(text, isError = false) {
	statusEl.textContent = text;
	statusEl.style.color = isError ? 'crimson' : '';
}

function formatValue(v, fallback = 'N/A') {
	if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return fallback;
	if (typeof v === 'number') return Number.isFinite(v) ? (Number.isInteger(v) ? String(v) : v.toFixed(2)) : String(v);
	return String(v);
}

function escapeHtml(s) {
	return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function normalizeData(data) {
	if (!data || typeof data !== 'object') return { levels: [] };
	if (!Array.isArray(data.levels)) data.levels = [];
	return data;
}

async function fetchLegacyJson() {
	const jsonPaths = ['list.json', 'Demon List/list.json', 'Demon%20List/list.json'];
	for (const path of jsonPaths) {
		try {
			const response = await fetch(encodeURI(path) + '?_=' + Date.now());
			if (!response.ok) continue;
			const parsed = await response.json();
			const normalized = normalizeData(parsed);
			if (normalized.levels.length) return normalized;
		} catch (error) {
			// Keep trying the next path.
		}
	}
	return null;
}

function renderList(data) {
	container.innerHTML = '';
	if (!data || !Array.isArray(data.levels) || data.levels.length === 0) {
		container.textContent = 'No data available.';
		return;
	}

	const row = document.createElement('div');
	row.className = 'flex-row';

	data.levels.forEach(item => {
		const card = document.createElement('article');
		card.className = 'card';

		const rankEl = document.createElement('div');
		rankEl.className = 'rank';
		const rankValue = item.current_rank ?? item.initial_rank;
		rankEl.textContent = '#' + formatValue(rankValue, 'N/A');
		card.appendChild(rankEl);

		const content = document.createElement('div');
		content.className = 'card-content';

		const title = document.createElement('h2');
		title.textContent = formatValue(item.level);
		content.appendChild(title);

		const meta = document.createElement('div');
		meta.className = 'meta';

		const points = document.createElement('p');
		points.innerHTML = `<strong>Points:</strong> ${escapeHtml(formatValue(item.points))} <strong>ID:</strong> ${escapeHtml(formatValue(item.id))}`;
		meta.appendChild(points);

		const verifier = document.createElement('p');
		verifier.innerHTML = `<strong>Verifier:</strong> ${escapeHtml(formatValue(item.verifier))} <strong>Fruit:</strong> ${escapeHtml(formatValue(item.verifier_fruit))}`;
		meta.appendChild(verifier);

		const verifyDate = document.createElement('p');
		verifyDate.innerHTML = `<strong>Verified:</strong> ${escapeHtml(formatValue(item.verify_date))} <strong>Initial Rank:</strong> ${escapeHtml(formatValue(item.initial_rank))}`;
		meta.appendChild(verifyDate);

		const victors = document.createElement('p');
		const victorsList = Array.isArray(item.victors) && item.victors.length ? item.victors.join(', ') : 'N/A';
		victors.innerHTML = `<strong>Victors:</strong> ${escapeHtml(victorsList)}`;
		meta.appendChild(victors);

		content.appendChild(meta);
		card.appendChild(content);

		if (item.image || item.showcase_url || item.verification_url) {
			const media = document.createElement('div');
			media.className = 'media';

			const actions = document.createElement('div');
			actions.className = 'actions';

			if (item.showcase_url) {
				const showcase = document.createElement('a');
				showcase.className = 'btn';
				showcase.href = item.showcase_url;
				showcase.target = '_blank';
				showcase.rel = 'noopener noreferrer';
				showcase.textContent = 'View Showcase';
				actions.appendChild(showcase);
			}

			if (item.verification_url) {
				const verification = document.createElement('a');
				verification.className = 'btn';
				verification.href = item.verification_url;
				verification.target = '_blank';
				verification.rel = 'noopener noreferrer';
				verification.textContent = 'View Verification';
				actions.appendChild(verification);
			}

			media.appendChild(actions);

			const img = document.createElement('img');
			img.className = 'thumb';
			if (item.image) {
				img.src = item.image;
				img.alt = formatValue(item.level) + ' thumbnail';
				img.onerror = () => {
					img.style.display = 'none';
				};
			} else {
				img.style.display = 'none';
			}
			media.appendChild(img);

			card.appendChild(media);
		}

		row.appendChild(card);
	});

	container.appendChild(row);
}

async function persistCurrentData() {
	if (!listRef) {
		alert('Firebase is not connected.');
		return;
	}
	try {
		await listRef.set(currentData);
		setStatus('Saved to Firebase at ' + new Date().toLocaleTimeString());
	} catch (err) {
		setStatus('Failed to save to Firebase: ' + err.message, true);
	}
}

function openPinModal() {
	editorModal.classList.remove('hidden');
	editorModal.setAttribute('aria-hidden', 'false');
	pinInput.value = '';
	pinInput.focus();
}

function closePinModal() {
	editorModal.classList.add('hidden');
	editorModal.setAttribute('aria-hidden', 'true');
}

function openEditor() {
	editorUnlocked = true;
	editorPanel.classList.remove('hidden');
	editorPanel.setAttribute('aria-hidden', 'false');
	renderEditorList();
}

function closeEditor() {
	editorPanel.classList.add('hidden');
	editorPanel.setAttribute('aria-hidden', 'true');
}

function resolveEditorPin() {
	return String(livePin ?? window.EDITOR_PIN ?? '634872');
}

pinSubmit.addEventListener('click', () => {
	const entered = String(pinInput.value || '');
	if (entered === resolveEditorPin()) {
		closePinModal();
		openEditor();
	} else {
		alert('Incorrect PIN');
		pinInput.focus();
	}
});

pinCancel.addEventListener('click', closePinModal);
editorButton.addEventListener('click', () => (editorUnlocked ? openEditor() : openPinModal()));
editorClose.addEventListener('click', closeEditor);

function renderEditorList() {
	editorList.innerHTML = '';
	if (!currentData || !Array.isArray(currentData.levels)) return;

	currentData.levels.forEach((item, idx) => {
		const wrapper = document.createElement('div');
		wrapper.className = 'editor-item';

		const fields = document.createElement('div');
		fields.className = 'editor-fields';

		function makeInput(key, placeholder) {
			const inp = document.createElement('input');
			inp.value = item[key] == null ? '' : item[key];
			inp.placeholder = placeholder || key;
			return inp;
		}

		const inpLevel = makeInput('level', 'Level name');
		const inpPoints = makeInput('points', 'Points');
		const inpId = makeInput('id', 'ID');
		const inpVerifier = makeInput('verifier', 'Verifier');
		const inpDate = makeInput('verify_date', 'Verify date');
		const inpRank = makeInput('initial_rank', 'Initial rank');
		const inpCurrentRank = makeInput('current_rank', 'Current rank');
		const inpImage = makeInput('image', 'Image URL');
		const inpFruit = makeInput('verifier_fruit', 'Verifier fruit');
		const inpShowcase = makeInput('showcase_url', 'Showcase URL');
		const inpVerification = makeInput('verification_url', 'Verification URL');
		const inpVictors = document.createElement('input');
		inpVictors.value = Array.isArray(item.victors) ? item.victors.join(', ') : item.victors || '';
		inpVictors.placeholder = 'Victors (comma separated)';

		[inpLevel, inpPoints, inpId, inpVerifier, inpDate, inpRank, inpCurrentRank, inpImage, inpFruit, inpShowcase, inpVerification, inpVictors].forEach(i => fields.appendChild(i));

		const actions = document.createElement('div');
		actions.className = 'editor-item-actions';

		const saveBtn = document.createElement('button');
		saveBtn.textContent = 'Save';
		saveBtn.addEventListener('click', async () => {
			item.level = inpLevel.value || item.level;
			const p = parseFloat(inpPoints.value);
			item.points = Number.isNaN(p) ? item.points : p;
			const iid = parseInt(inpId.value, 10);
			item.id = Number.isNaN(iid) ? item.id : iid;
			item.verifier = inpVerifier.value || item.verifier;
			item.verify_date = inpDate.value || item.verify_date;
			const ir = parseInt(inpRank.value, 10);
			item.initial_rank = Number.isNaN(ir) ? item.initial_rank : ir;
			const cr = parseInt(inpCurrentRank.value, 10);
			item.current_rank = Number.isNaN(cr) ? item.current_rank : cr;
			item.image = inpImage.value || item.image;
			item.verifier_fruit = inpFruit.value || item.verifier_fruit;
			item.showcase_url = inpShowcase.value || item.showcase_url;
			item.verification_url = inpVerification.value || item.verification_url;
			item.victors = inpVictors.value.split(',').map(s => s.trim()).filter(Boolean);

			renderList(currentData);
			renderEditorList();
			await persistCurrentData();
		});

		const delBtn = document.createElement('button');
		delBtn.textContent = 'Delete';
		delBtn.addEventListener('click', async () => {
			if (!confirm('Delete this entry?')) return;
			currentData.levels.splice(idx, 1);
			renderList(currentData);
			renderEditorList();
			await persistCurrentData();
		});

		actions.appendChild(saveBtn);
		actions.appendChild(delBtn);
		wrapper.appendChild(fields);
		wrapper.appendChild(actions);
		editorList.appendChild(wrapper);
	});
}

addEntryBtn.addEventListener('click', async () => {
	const newLevel = document.getElementById('new-level').value.trim();
	if (!newLevel) {
		alert('Level name required');
		return;
	}

	const entry = {
		level: newLevel,
		points: (() => {
			const v = parseFloat(document.getElementById('new-points').value);
			return Number.isNaN(v) ? 0 : v;
		})(),
		id: (() => {
			const v = parseInt(document.getElementById('new-id').value, 10);
			return Number.isNaN(v) ? Date.now() : v;
		})(),
		verifier: document.getElementById('new-verifier').value || 'N/A',
		verify_date: document.getElementById('new-verify_date').value || new Date().toISOString().slice(0, 10),
		initial_rank: (() => {
			const v = parseInt(document.getElementById('new-initial_rank').value, 10);
			return Number.isNaN(v) ? 0 : v;
		})(),
		current_rank: (() => {
			const v = parseInt(document.getElementById('new-current_rank').value, 10);
			return Number.isNaN(v) ? null : v;
		})(),
		image: document.getElementById('new-image').value || '',
		verifier_fruit: document.getElementById('new-verifier_fruit').value || 'N/A',
		showcase_url: document.getElementById('new-showcase_url').value || '',
		verification_url: document.getElementById('new-verification_url').value || '',
		victors: (document.getElementById('new-victors').value || '').split(',').map(s => s.trim()).filter(Boolean)
	};

	currentData.levels.push(entry);
	renderList(currentData);
	renderEditorList();
	await persistCurrentData();

	['new-level', 'new-points', 'new-id', 'new-verifier', 'new-verify_date', 'new-initial_rank', 'new-current_rank', 'new-image', 'new-verifier_fruit', 'new-showcase_url', 'new-verification_url', 'new-victors'].forEach(id => {
		document.getElementById(id).value = '';
	});
});

function initFirebaseLiveSync() {
	if (!window.firebase || !window.FIREBASE_CONFIG || window.FIREBASE_CONFIG.apiKey === 'REPLACE_ME') {
		setStatus('Firebase config missing. Update firebase-config.js to enable live data.', true);
		renderList(currentData);
		return;
	}

	try {
		firebase.initializeApp(window.FIREBASE_CONFIG);
		const database = firebase.database();
		const rootPath = String(window.FIREBASE_LIST_PATH || 'fruit-demon-list');
		listRef = database.ref(rootPath + '/data');
		const pinRef = database.ref(rootPath + '/meta/editorPin');

		setStatus('Connecting to Firebase...');

		pinRef.on('value', snap => {
			livePin = snap.exists() ? snap.val() : null;
		});

		listRef.on(
			'value',
			async snap => {
				if (!snap.exists() && !hasSeedAttempted) {
					hasSeedAttempted = true;
					setStatus('Firebase is empty. Trying to migrate legacy JSON...');
					const legacyData = await fetchLegacyJson();
					if (legacyData) {
						currentData = legacyData;
						renderList(currentData);
						await persistCurrentData();
						setStatus('Legacy JSON imported to Firebase — ' + new Date().toLocaleTimeString());
						return;
					}
				}

				const incoming = normalizeData(snap.val());
				currentData = incoming;
				renderList(currentData);
				if (editorPanel.getAttribute('aria-hidden') === 'false') renderEditorList();
				setStatus('Live from Firebase — ' + new Date().toLocaleTimeString());
			},
			err => {
				setStatus('Firebase read error: ' + err.message, true);
			}
		);
	} catch (err) {
		setStatus('Failed to initialize Firebase: ' + err.message, true);
	}
}

initFirebaseLiveSync();
