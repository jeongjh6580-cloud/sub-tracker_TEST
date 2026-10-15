/*
 * 구독 데이터의 흐름을 관리하는 시작 파일입니다.
 * 폼 입력 -> 구독 배열 갱신 -> localStorage 저장 -> 화면 다시 그리기 순서로 동작합니다.
 * 금액, 결제일까지 남은 일수, 주간 결제, 카테고리 집계는 기존 logic.js 함수를 사용합니다.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'monthly-subscriptions-v1';
  const ui = window.SubscriptionUI;
  const logicFunctions = [
    'getMonthlyAmount',
    'getTotalMonthlyAmount',
    'getTotalYearlyAmount',
    'getRemainingDays',
    'getUpcomingPayments',
    'getMonthlyAmountByCategory'
  ];

  const form = document.getElementById('subscription-form');
  const nameInput = document.getElementById('sub-name');
  const amountInput = document.getElementById('sub-amount');
  const cycleInput = document.getElementById('sub-cycle');
  const dateInput = document.getElementById('sub-date');
  const categoryInput = document.getElementById('sub-category');
  const cancelEditButton = document.getElementById('cancel-edit');
  const submitLabel = document.getElementById('submit-label');
  const subscriptionList = document.getElementById('subscription-list');
  const message = document.getElementById('app-message');

  let subscriptions = loadSubscriptions();
  let editingId = null;

  /* 기존 계산 스크립트가 먼저 로드되었는지 확인하면 빈 화면 대신 원인을 안내할 수 있습니다. */
  const missingFunctions = logicFunctions.filter((functionName) => typeof window[functionName] !== 'function');
  if (!ui || missingFunctions.length > 0) {
    showMessage(`계산 함수를 찾지 못했습니다: ${missingFunctions.join(', ')}. index.html의 logic.js 경로를 확인해 주세요.`, true);
    return;
  }

  form.addEventListener('submit', handleFormSubmit);
  cancelEditButton.addEventListener('click', resetForm);
  subscriptionList.addEventListener('click', handleListAction);

  render();

  /**
   * 브라우저 저장 공간에 기록된 목록을 가져옵니다.
   * 파일이 처음 열렸거나 저장 내용이 깨진 경우에는 빈 배열로 시작해 화면이 계속 동작하도록 합니다.
   * @returns {Object[]} 유효한 구독 항목 목록
   */
  function loadSubscriptions() {
    try {
      const storedValue = localStorage.getItem(STORAGE_KEY);
      if (!storedValue) return [];
      const parsedValue = JSON.parse(storedValue);
      if (!Array.isArray(parsedValue)) throw new Error('저장된 데이터가 목록 형식이 아닙니다.');
      return parsedValue.map(normalizeSubscription).filter(Boolean);
    } catch (error) {
      showMessage('저장된 구독 정보를 읽지 못해 빈 목록으로 시작합니다.', true);
      return [];
    }
  }

  /** 저장 데이터에 필수 값이 있는지 검사하고, 브라우저 표시/계산에 쓸 형식으로 정리합니다. */
  function normalizeSubscription(item) {
    if (!item || typeof item !== 'object') return null;
    const name = String(item.name || '').trim();
    const amount = Number(item.amount);
    const cycle = item.cycle === 'yearly' ? 'yearly' : item.cycle === 'monthly' ? 'monthly' : '';
    const nextPaymentDate = String(item.nextPaymentDate || '');
    if (!name || !Number.isFinite(amount) || amount <= 0 || !cycle || !isValidDate(nextPaymentDate)) return null;

    return {
      id: String(item.id || createId()),
      name,
      amount,
      cycle,
      nextPaymentDate,
      category: String(item.category || '기타').trim() || '기타'
    };
  }

  /** 날짜 입력값과 저장 데이터가 YYYY-MM-DD의 실제 달력 날짜인지 확인합니다. */
  function isValidDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  /** 현재 날짜를 시간대 차이 없이 YYYY-MM-DD 형식으로 만듭니다. */
  function getTodayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 폼을 제출하면 새 항목을 추가하거나 편집 중인 항목을 교체합니다.
   * 배열을 수정한 다음 저장하고 화면을 그리는 모든 흐름을 한 함수에서 관리합니다.
   */
  function handleFormSubmit(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const subscription = {
      id: editingId || createId(),
      name: nameInput.value.trim(),
      amount: Number(amountInput.value),
      cycle: cycleInput.value,
      nextPaymentDate: dateInput.value,
      category: categoryInput.value.trim() || '기타'
    };

    if (!subscription.name || !Number.isFinite(subscription.amount) || subscription.amount <= 0 || !isValidDate(subscription.nextPaymentDate)) {
      showMessage('이름, 0보다 큰 금액, 올바른 결제일을 입력해 주세요.', true);
      return;
    }

    if (editingId) {
      subscriptions = subscriptions.map((item) => item.id === editingId ? subscription : item);
      showMessage('구독 정보를 수정했습니다.', false);
    } else {
      subscriptions = [...subscriptions, subscription];
      showMessage('새 구독을 추가했습니다.', false);
    }

    saveSubscriptions();
    resetForm();
    render();
  }

  /** 목록의 수정/삭제 버튼 클릭을 받아 해당 구독만 처리합니다. */
  function handleListAction(event) {
    const button = event.target.closest('button[data-action][data-id]');
    if (!button) return;

    const subscription = subscriptions.find((item) => item.id === button.dataset.id);
    if (!subscription) return;

    if (button.dataset.action === 'edit') {
      beginEditing(subscription);
    } else if (button.dataset.action === 'delete') {
      deleteSubscription(subscription);
    }
  }

  /** 선택한 항목의 내용을 폼에 채워 추가 모드를 수정 모드로 바꿉니다. */
  function beginEditing(subscription) {
    editingId = subscription.id;
    nameInput.value = subscription.name;
    amountInput.value = String(subscription.amount);
    cycleInput.value = subscription.cycle;
    dateInput.value = subscription.nextPaymentDate;
    categoryInput.value = subscription.category;
    submitLabel.textContent = '수정 저장';
    cancelEditButton.hidden = false;
    document.getElementById('form-title').textContent = '구독 수정';
    document.querySelector('.form-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    nameInput.focus({ preventScroll: true });
  }

  /** 실수로 지우는 일을 줄이기 위해 확인한 뒤 목록과 저장 데이터를 함께 갱신합니다. */
  function deleteSubscription(subscription) {
    const shouldDelete = window.confirm(`'${subscription.name}' 구독을 삭제할까요?`);
    if (!shouldDelete) return;

    subscriptions = subscriptions.filter((item) => item.id !== subscription.id);
    if (editingId === subscription.id) resetForm();
    saveSubscriptions();
    render();
    showMessage('구독을 삭제했습니다.', false);
  }

  /** 입력 폼을 새 항목 추가 상태로 되돌립니다. */
  function resetForm() {
    editingId = null;
    form.reset();
    categoryInput.value = '기타';
    submitLabel.textContent = '구독 추가';
    cancelEditButton.hidden = true;
    document.getElementById('form-title').textContent = '새 구독 추가';
  }

  /** localStorage 저장 실패도 사용자에게 알리고, 현재 페이지 안의 변경 사항은 계속 보여줍니다. */
  function saveSubscriptions() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
      return true;
    } catch (error) {
      showMessage('브라우저 저장 공간에 기록하지 못했습니다. 현재 탭을 닫으면 변경 내용이 사라질 수 있습니다.', true);
      return false;
    }
  }

  /** ID는 브라우저 UUID를 우선 사용하고, 미지원 환경에서는 시간과 난수로 만듭니다. */
  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  /** 현재 구독 배열을 기존 계산 함수와 UI 렌더러에 전달해 화면 전체를 다시 그립니다. */
  function render() {
    const today = getTodayString();
    ui.renderSummary(subscriptions, today);
    ui.renderSubscriptionList(subscriptions, today);
    ui.renderCategoryBreakdown(subscriptions);
  }

  /** 상태 안내 문구를 표시하고 오류인지 일반 완료인지 색상 클래스로 구분합니다. */
  function showMessage(text, isError) {
    if (!message) return;
    message.textContent = text;
    message.hidden = false;
    message.classList.toggle('app-message--error', isError);
  }
})();
