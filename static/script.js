const classroom = document.getElementById('classroom');
const warningArea = document.getElementById('warning-area');
const lastNumberInput = document.getElementById('lastNumber');
const absentsInput = document.getElementById('absents');
const btnReset = document.getElementById('btn-reset');
const btnUndo = document.getElementById('btn-undo');
const btnAssign = document.getElementById('btn-assign');
const btnVote = document.getElementById('btn-vote');
const btnSave = document.getElementById('btn-save');
const loadingImg = document.getElementById('loading');
const savedLayouts = document.getElementById('saved-layouts');

let seats = []; // 사용자가 배치한 좌석들 {x, y, number}
let seatHistory = [];

// 좌석 배치 영역: div#classroom 에서 좌석 클릭 위치 저장 및 좌석 원 생성
classroom.style.position = 'relative';

classroom.addEventListener('click', (e) => {
  const rect = classroom.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const seat = document.createElement('div');
  seat.classList.add('seat');
  seat.style.left = (x - 20) + 'px';
  seat.style.top = (y - 20) + 'px';
  seat.textContent = '';
  seat.dataset.index = seats.length;

  // 클릭 시 prompt로 번호 입력
  seat.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const newNumber = prompt('좌석 번호를 입력하세요 (1~999):');
    if (newNumber === null) return; // 취소

    const num = parseInt(newNumber);
    if (isNaN(num) || num < 1 || num > 999) {
      showWarning('유효한 숫자(1~999)를 입력하세요.');
      return;
    }

    if (seats.some((s, i) => i !== parseInt(seat.dataset.index) && s.number === num.toString())) {
      showWarning('이미 사용 중인 번호입니다.');
      return;
    }

    seats[seat.dataset.index].number = num.toString();
    clearWarning();
    updateNumberInputs();
  });

  classroom.appendChild(seat);
  seats.push({ x, y, number: '' });
  seatHistory.push(seat);
  clearWarning();
  updateNumberInputs();
});

function updateNumberInputs() {
  seatHistory.forEach((seatDiv, i) => {
    seatDiv.textContent = seats[i].number || '';
    if (seats[i].number) seatDiv.classList.add('assigned');
    else seatDiv.classList.remove('assigned');
  });
}

function clearWarning() {
  warningArea.textContent = '';
}

function showWarning(msg) {
  warningArea.textContent = msg;
}

// 초기화
btnReset.addEventListener('click', () => {
  seats = [];
  seatHistory.forEach(seatDiv => seatDiv.remove());
  seatHistory = [];
  clearWarning();
  btnSave.style.display = 'none';
  savedLayouts.innerHTML = '<h3>저장된 배치</h3>';
});

// 뒤로가기
btnUndo.addEventListener('click', () => {
  if (seatHistory.length === 0) return;
  const lastSeatDiv = seatHistory.pop();
  lastSeatDiv.remove();
  seats.pop();
  clearWarning();
  updateNumberInputs();
});

// 배치
btnAssign.addEventListener('click', () => {
  clearWarning();

  if (seats.length === 0) {
    showWarning('좌석을 먼저 배치하세요.');
    return;
  }

  const lastNumber = parseInt(lastNumberInput.value);
  if (isNaN(lastNumber) || lastNumber < 1) {
    showWarning('올바른 마지막 번호를 입력하세요.');
    return;
  }

  let absents = absentsInput.value.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));
  if (lastNumber - absents.length > seats.length) {
    showWarning('자리가 부족합니다.');
    return;
  }

  loadingImg.style.display = 'block';
  btnAssign.disabled = true;
  btnReset.disabled = true;
  btnUndo.disabled = true;
  btnSave.style.display = 'none';

  setTimeout(() => {
    loadingImg.style.display = 'none';
    btnAssign.disabled = false;
    btnReset.disabled = false;
    btnUndo.disabled = false;

    fetch('/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        last_number: lastNumber,
        absences: absents,
        seats: seats.map(s => ({ x: s.x, y: s.y }))
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          data.assigned.forEach((item, i) => {
            seats[i].number = item.number ? item.number.toString() : '';
          });
          updateNumberInputs();
          btnSave.style.display = 'inline-block';
          clearWarning();
        } else {
          showWarning('배치 실패했습니다.');
        }
      });
  }, 4000);
});

// 저장
btnSave.addEventListener('click', () => {
  const saveData = {
    seats: seats.filter(s => s.number !== '').map(s => ({ x: s.x, y: s.y, number: parseInt(s.number) }))
  };

  fetch('/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(saveData)
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === 'saved') {
        addSavedLayout(saveData);
      } else {
        showWarning('저장 실패했습니다.');
      }
    });
});

function addSavedLayout(data) {
  const div = document.createElement('div');
  div.classList.add('saved-layout');
  div.style.position = 'relative';

  // 기준: 현재 교실(classroom)의 크기
  const originalWidth = classroom.clientWidth;
  const originalHeight = classroom.clientHeight;

  // 미리보기 배치 박스 크기 설정 (임의로 정할 수 있음)
  const previewWidth = 200;
  const previewHeight = 200;
  div.style.width = previewWidth + 'px';
  div.style.height = previewHeight + 'px';
  div.style.border = '1px solid #ccc';
  div.style.margin = '10px';
  div.style.background = '#f9f9f9';

  // 비율 계산
  const scaleX = previewWidth / originalWidth;
  const scaleY = previewHeight / originalHeight;

  data.seats.forEach(s => {
    const seat = document.createElement('div');
    seat.classList.add('seat', 'assigned');
    seat.style.position = 'absolute';

    // 좌표 축소
    seat.style.left = (s.x * scaleX - 10) + 'px';
    seat.style.top = (s.y * scaleY - 10) + 'px';

    // 크기도 축소 (기본 원 반지름 20px이니까 줄이자)
    seat.style.width = '20px';
    seat.style.height = '20px';
    seat.style.fontSize = '10px';

    seat.textContent = s.number;
    div.appendChild(seat);
  });

  savedLayouts.appendChild(div);
}


btnVote.addEventListener('click', () => {
  window.location.href = '/vote';
});
