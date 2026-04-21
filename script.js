const jsonPaths = ['list.json', 'Demon List/list.json', 'Demon%20List/list.json'];
let jsonPath = jsonPaths[0];
const statusEl = document.getElementById('status');
const container = document.getElementById('demon-list');
let lastJSON = null;
let currentData = null;
let editorUnlocked = false;

function setStatus(text, isError = false) {
	statusEl.textContent = text;
	statusEl.style.color = isError ? 'crimson' : '';
}

function formatValue(v, fallback = 'N/A') {
	if (v === null || v === undefined || (typeof v === 'string' && v.trim() === '')) return fallback;
	if (typeof v === 'number') {
		if (!Number.isFinite(v)) return String(v);
		return Number.isInteger(v) ? String(v) : v.toFixed(2);
	}
	return String(v);
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

		const title = document.createElement('h2');
		title.textContent = formatValue(item.level);
		card.appendChild(title);

		const meta = document.createElement('div');
		meta.className = 'meta';

		const points = document.createElement('p');
		points.innerHTML = `<strong>Points:</strong> ${escapeHtml(formatValue(item.points))}    <strong>ID:</strong> ${escapeHtml(formatValue(item.id))}`;
		meta.appendChild(points);

		const verifier = document.createElement('p');
		verifier.innerHTML = `<strong>Verifier:</strong> ${escapeHtml(formatValue(item.verifier))}    <strong>Fruit:</strong> ${escapeHtml(formatValue(item.verifier_fruit))}`;
		meta.appendChild(verifier);

		const verifyDate = document.createElement('p');
		verifyDate.innerHTML = `<strong>Verified:</strong> ${escapeHtml(formatValue(item.verify_date))}    <strong>Initial Rank:</strong> ${escapeHtml(formatValue(item.initial_rank))}`;
		meta.appendChild(verifyDate);

		const victors = document.createElement('p');
		const victorsList = (Array.isArray(item.victors) && item.victors.length) ? item.victors.join(', ') : 'N/A';
		victors.innerHTML = `<strong>Victors:</strong> ${escapeHtml(victorsList)}`;
		meta.appendChild(victors);

		card.appendChild(meta);

		row.appendChild(card);
	});

	container.appendChild(row);
}

function escapeHtml(s) {
	return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]);
}

async function tryFetchPaths(paths) {
	let lastErr = null;
	for (const p of paths) {
		try {
			const res = await fetch(encodeURI(p) + '?_=' + Date.now());
			if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
			const data = await res.json();
			jsonPath = p; // save the working path for later
			return { data };
		} catch (err) {
			lastErr = err;
		}
	}
	return { error: lastErr };
}

async function load() {
	setStatus('Loading...');
	try {
		const { data, error } = await tryFetchPaths(jsonPaths);
		if (error) throw error;
		currentData = data;
		const jsonStr = JSON.stringify(data);
		if (jsonStr !== lastJSON) {
			lastJSON = jsonStr;
			renderList(data);
			setStatus('Updated ' + new Date().toLocaleTimeString());
		} else {
			setStatus('No changes — last checked ' + new Date().toLocaleTimeString());
		}
	} catch (err) {
		setStatus('Failed to load list: ' + err.message, true);
	}
}

load();
setInterval(load, 5000);

// --- Editor UI ---
// Simple hardcoded PIN (no env lookup)
const EDITOR_PIN = '634872';
const editorButton = document.getElementById('editor-button');
const editorModal = document.getElementById('editor-modal');
const pinInput = document.getElementById('pin-input');
const pinSubmit = document.getElementById('pin-submit');
const pinCancel = document.getElementById('pin-cancel');
const editorPanel = document.getElementById('editor-panel');
const editorClose = document.getElementById('editor-close');
const editorList = document.getElementById('editor-list');
const downloadBtn = document.getElementById('download-json');
const addEntryBtn = document.getElementById('add-entry');

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

pinSubmit.addEventListener('click', () => {
	if (pinInput.value === EDITOR_PIN) {
		closePinModal();
		openEditor();
	} else {
		alert('Incorrect PIN');
		pinInput.focus();
	}
});

pinCancel.addEventListener('click', () => closePinModal());
editorButton.addEventListener('click', () => {
	if (editorUnlocked) openEditor(); else openPinModal();
});
editorClose.addEventListener('click', () => closeEditor());

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
		const inpFruit = makeInput('verifier_fruit', 'Verifier fruit');
		const inpVictors = document.createElement('input');
		inpVictors.value = Array.isArray(item.victors) ? item.victors.join(', ') : (item.victors || '');
		inpVictors.placeholder = 'Victors (comma separated)';

		[inpLevel, inpPoints, inpId, inpVerifier, inpDate, inpRank, inpFruit, inpVictors].forEach(i => fields.appendChild(i));

		const actions = document.createElement('div');
		actions.className = 'editor-item-actions';
		const saveBtn = document.createElement('button');
		saveBtn.textContent = 'Save';
		saveBtn.addEventListener('click', () => {
			// apply changes
			item.level = inpLevel.value || item.level;
			const p = parseFloat(inpPoints.value);
			item.points = isNaN(p) ? item.points : p;
			const iid = parseInt(inpId.value, 10);
			item.id = isNaN(iid) ? item.id : iid;
			item.verifier = inpVerifier.value || item.verifier;
			item.verify_date = inpDate.value || item.verify_date;
			const ir = parseInt(inpRank.value, 10);
			item.initial_rank = isNaN(ir) ? item.initial_rank : ir;
			item.verifier_fruit = inpFruit.value || item.verifier_fruit;
			item.victors = inpVictors.value.split(',').map(s => s.trim()).filter(Boolean);
			// update view
			lastJSON = JSON.stringify(currentData);
			renderList(currentData);
			renderEditorList();
		});

		const delBtn = document.createElement('button');
		delBtn.textContent = 'Delete';
		delBtn.addEventListener('click', () => {
			if (!confirm('Delete this entry?')) return;
			currentData.levels.splice(idx, 1);
			lastJSON = JSON.stringify(currentData);
			renderList(currentData);
			renderEditorList();
		});

		actions.appendChild(saveBtn);
		actions.appendChild(delBtn);

		wrapper.appendChild(fields);
		wrapper.appendChild(actions);
		editorList.appendChild(wrapper);
	});
}

addEntryBtn.addEventListener('click', () => {
	const newLevel = document.getElementById('new-level').value.trim();
	if (!newLevel) { alert('Level name required'); return; }
	const entry = {
		level: newLevel,
		points: (function(){const v=parseFloat(document.getElementById('new-points').value); return isNaN(v)?0:v})(),
		id: (function(){const v=parseInt(document.getElementById('new-id').value,10); return isNaN(v)?Date.now():v})(),
		verifier: document.getElementById('new-verifier').value || 'N/A',
		verify_date: document.getElementById('new-verify_date').value || new Date().toISOString().slice(0,10),
		initial_rank: (function(){const v=parseInt(document.getElementById('new-initial_rank').value,10); return isNaN(v)?0:v})(),
		verifier_fruit: document.getElementById('new-verifier_fruit').value || 'N/A',
		victors: (document.getElementById('new-victors').value || '').split(',').map(s=>s.trim()).filter(Boolean)
	};
	if (!currentData) currentData = { levels: [] };
	currentData.levels.push(entry);
	lastJSON = JSON.stringify(currentData);
	renderList(currentData);
	renderEditorList();
	// clear new fields
	['new-level','new-points','new-id','new-verifier','new-verify_date','new-initial_rank','new-verifier_fruit','new-victors'].forEach(id => document.getElementById(id).value='');
});

downloadBtn.addEventListener('click', () => {
	if (!currentData) { alert('No data to download'); return; }
	const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'list.json';
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
});
