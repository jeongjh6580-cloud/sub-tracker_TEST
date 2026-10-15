/*
 * 화면에 값을 그리는 함수만 모아 둔 파일입니다.
 * 구독 데이터를 어디에 저장하는지, 버튼을 눌렀을 때 어떤 변경을 하는지는 main.js가 담당합니다.
 * 이 파일은 type="module" 없이 불러오기 때문에, 공개할 함수들을 window.SubscriptionUI에 모읍니다.
 */
(function () {
  'use strict';

  const currencyFormatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0
  });

  /**
   * 월 합계와 연간 합계, 7일 안에 예정된 결제 건수를 요약 카드에 표시합니다.
   * 금액 계산과 결제 예정 항목 선정은 기존 logic.js의 함수를 그대로 사용합니다.
   * @param {Object[]} subscriptions 화면에 표시할 구독 목록
   * @param {string} today 오늘 날짜(YYYY-MM-DD)
   */
  function renderSummary(subscriptions, today) {
    const monthlyTotal = window.getTotalMonthlyAmount(subscriptions);
    const yearlyTotal = window.getTotalYearlyAmount(subscriptions);
    const upcomingPayments = window.getUpcomingPayments(subscriptions, today, 7);

    document.getElementById('monthly-total').textContent = currencyFormatter.format(monthlyTotal);
    document.getElementById('yearly-total').textContent = currencyFormatter.format(yearlyTotal);
    document.getElementById('upcoming-count').textContent = String(upcomingPayments.length);
  }

  /**
   * 구독 카드 목록을 결제 예정일이 가까운 순서로 다시 만듭니다.
   * 이름과 카테고리는 textContent로 넣어 입력값이 HTML로 실행되지 않도록 합니다.
   * @param {Object[]} subscriptions 구독 목록
   * @param {string} today 오늘 날짜(YYYY-MM-DD)
   */
  function renderSubscriptionList(subscriptions, today) {
    const list = document.getElementById('subscription-list');
    const count = document.getElementById('subscription-count');
    list.replaceChildren();
    count.textContent = `${subscriptions.length}개`;

    if (subscriptions.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-list';
      const symbol = document.createElement('span');
      symbol.className = 'empty-illustration';
      symbol.setAttribute('aria-hidden', 'true');
      symbol.textContent = '↗';
      const title = document.createElement('strong');
      title.textContent = '아직 등록한 구독이 없어요';
      const detail = document.createElement('span');
      detail.textContent = '양식에 첫 구독을 추가해 보세요.';
      empty.append(symbol, title, detail);
      list.append(empty);
      return;
    }

    const sortedSubscriptions = [...subscriptions].sort((first, second) =>
      first.nextPaymentDate.localeCompare(second.nextPaymentDate) || first.name.localeCompare(second.name, 'ko')
    );

    for (const subscription of sortedSubscriptions) {
      list.append(createSubscriptionCard(subscription, today));
    }
  }

  /**
   * 구독 한 건을 보여주는 카드 DOM을 만듭니다.
   * 매년 결제 구독도 기존 getMonthlyAmount 함수로 월 환산 금액을 계산합니다.
   * @param {Object} subscription 구독 하나
   * @param {string} today 오늘 날짜(YYYY-MM-DD)
   * @returns {HTMLElement} 구독 카드
   */
  function createSubscriptionCard(subscription, today) {
    const card = document.createElement('article');
    card.className = 'subscription-card';

    const cardTop = document.createElement('div');
    cardTop.className = 'subscription-card-top';

    const identity = document.createElement('div');
    identity.className = 'subscription-identity';
    const icon = document.createElement('span');
    icon.className = 'subscription-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = subscription.name.trim().charAt(0).toUpperCase();
    const nameGroup = document.createElement('div');
    nameGroup.className = 'subscription-name-group';
    const name = document.createElement('h3');
    name.className = 'subscription-name';
    name.textContent = subscription.name;
    const category = document.createElement('span');
    category.className = 'category-tag';
    category.textContent = subscription.category;
    nameGroup.append(name, category);
    identity.append(icon, nameGroup);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.append(createActionButton('edit', subscription.id, '수정', '✎'));
    actions.append(createActionButton('delete', subscription.id, '삭제', '×'));
    cardTop.append(identity, actions);

    const cardBottom = document.createElement('div');
    cardBottom.className = 'subscription-card-bottom';
    const price = document.createElement('div');
    price.className = 'subscription-price';
    const amount = document.createElement('strong');
    amount.textContent = currencyFormatter.format(window.getMonthlyAmount(subscription));
    const cadence = document.createElement('span');
    cadence.textContent = '/ 월';
    price.append(amount, cadence);

    const payment = document.createElement('div');
    payment.className = 'payment-due';
    const date = document.createElement('span');
    date.className = 'payment-date';
    date.textContent = formatDate(subscription.nextPaymentDate);
    const dayCount = document.createElement('strong');
    dayCount.className = 'payment-day';
    const remainingDays = window.getRemainingDays(today, subscription.nextPaymentDate);
    if (remainingDays === 0) {
      dayCount.classList.add('payment-day--today');
      dayCount.textContent = '오늘';
    } else if (remainingDays > 0) {
      dayCount.textContent = `D-${remainingDays}`;
    } else if (remainingDays < 0) {
      dayCount.classList.add('payment-day--past');
      dayCount.textContent = `D+${Math.abs(remainingDays)}`;
    } else {
      dayCount.textContent = '날짜 확인';
    }
    payment.append(date, dayCount);
    cardBottom.append(price, payment);
    card.append(cardTop, cardBottom);
    return card;
  }

  /** 버튼의 역할과 구독 ID를 data 속성에 저장해 main.js가 클릭을 처리하게 합니다. */
  function createActionButton(action, id, label, symbol) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `icon-button icon-button--${action}`;
    button.dataset.action = action;
    button.dataset.id = id;
    button.setAttribute('aria-label', `${label} 구독`);
    button.title = `${label} 구독`;
    button.textContent = symbol;
    return button;
  }

  /** 날짜는 로컬 날짜로 읽어 화면에 월/일로 표시합니다. */
  function formatDate(dateValue) {
    const [year, month, day] = dateValue.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(date);
  }

  /**
   * 카테고리별 월 금액과 전체 월 지출 중 비율을 막대로 표시합니다.
   * 막대 너비는 CSS width 백분율로 계산해 차트 라이브러리 없이 그립니다.
   * @param {Object[]} subscriptions 구독 목록
   */
  function renderCategoryBreakdown(subscriptions) {
    const container = document.getElementById('category-breakdown');
    container.replaceChildren();

    if (subscriptions.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-note';
      empty.textContent = '구독을 추가하면 비중이 표시됩니다.';
      container.append(empty);
      return;
    }

    const monthlyByCategory = window.getMonthlyAmountByCategory(subscriptions);
    const monthlyTotal = window.getTotalMonthlyAmount(subscriptions);
    const entries = Object.entries(monthlyByCategory)
      .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0], 'ko'));

    entries.forEach(([category, amount], index) => {
      const percentage = monthlyTotal > 0 ? amount / monthlyTotal * 100 : 0;
      const row = document.createElement('div');
      row.className = 'category-row';

      const labels = document.createElement('div');
      labels.className = 'category-row-labels';
      const categoryName = document.createElement('span');
      categoryName.className = 'category-name';
      categoryName.textContent = category;
      const amountLabel = document.createElement('span');
      amountLabel.className = 'category-amount';
      amountLabel.textContent = currencyFormatter.format(amount);
      labels.append(categoryName, amountLabel);

      const track = document.createElement('div');
      track.className = 'category-track';
      track.setAttribute('role', 'img');
      track.setAttribute('aria-label', `${category} ${percentage.toFixed(1)}퍼센트`);
      const fill = document.createElement('div');
      fill.className = `category-fill category-fill--${index % 5 + 1}`;
      fill.style.width = `${percentage}%`;
      track.append(fill);

      const percentLabel = document.createElement('span');
      percentLabel.className = 'category-percent';
      percentLabel.textContent = `${percentage.toFixed(1)}%`;
      row.append(labels, track, percentLabel);
      container.append(row);
    });
  }

  window.SubscriptionUI = {
    renderSummary,
    renderSubscriptionList,
    renderCategoryBreakdown
  };
})();
