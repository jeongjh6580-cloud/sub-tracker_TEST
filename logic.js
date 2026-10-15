// 구독 데이터(subscription) 예시
//{
//  "id": "sub_1",
//  "name": "넷플릭스",
//  "amount": 13500,
//  "cycle": "monthly", //"monthly" 또는 "yearly"//  
//  "nextPaymentDate": "2024-06-15"
//  "category": "영상",
//  "paymentmethod": "신한카드""삼성카드"
//}

const testData = [
 {name:"넷플릭스",  amount:13500, cycle:"monthly",
  nextPaymentDate:"2026-08-16", category:"영상", paymentmethod: "신한카드"},        
 {name:"스포티파이",amount:10900, cycle:"monthly",  
  nextPaymentDate:"2026-08-20", category:"음악", paymentmethod: "삼성카드"},    
 {name:"헬스장",    amount:45000, cycle:"monthly",
  nextPaymentDate:"2026-09-01", category:"운동", paymentmethod: "신한카드"},    
 {name:"클라우드",  amount:120000,cycle:"yearly",
  nextPaymentDate:"2027-02-01", category:"생산성", paymentmethod: "삼성카드"}   
];

// 구독 1건을 받아 월 기준 금액으로 환산해 반환한다.
// cycle이 "yearly"면 12로 나누고, 원 단위로 반올림한다.    
function getMonthlyAmount(subscription) {   
    if (subscription.cycle === "yearly") {  
        return Math.round(subscription.amount / 12);    
    } else if (subscription.cycle === "monthly")     
        {   
        return subscription.amount;
    }           
}
// 구독 데이터 배열을 받아 월 기준 금액으로 환산한 총합을 반환한다. 
function getTotalMonthlyAmount(subscriptions) {
    let total = 0;  
    for (let subscription of subscriptions) {   
        total += getMonthlyAmount(subscription);
    }   
    return total;   
}
// 구독 목록 배열을 받아 연간 지출 합계를 반환한다. 
// 월 합계에 12를 곱해서 계산한다.  
function getTotalYearlyAmount(subscriptions) {  
    let totalMonthly = getTotalMonthlyAmount(subscriptions);    
    return totalMonthly * 12;
}       

// 오늘 날짜와 결제 예정일을 받아 남은 일수를 반환한다. 
// 두 값 모두 "YYYY-MM-DD" 형식의 문자열이다.
// 시각은 무시하고 날짜만 비교. 오늘이면 0, 지난 날짜면 음수.
function getRemainingDays(today, dueDate) {
    let todayObj = new Date(today);
    let dueDateObj = new Date(dueDate);
    let diffTime = dueDateObj - todayObj;
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}       
// 결제일이 N일 이내로 임박한 항목만 반환한다. 지난 것은 제외 
function getUpcomingPayments(subscriptions, today, days) {
    let upcoming = [];
    for (let subscription of subscriptions) {
        let remainingDays = getRemainingDays(today, subscription.nextPaymentDate);
        if (remainingDays >= 0 && remainingDays <= days) {
            upcoming.push(subscription);
        }
    }
    return upcoming;
}       
// 카테고리별로 묶어 { 카테고리: 월합계 } 형태로 반환한다. 
// 예: { "영상": 13500, "음악": 10900 }
function getMonthlyAmountByCategory(subscriptions) {
    let categoryTotals = {};
    for (let subscription of subscriptions) {
        let monthlyAmount = getMonthlyAmount(subscription);     
        if (!categoryTotals[subscription.category]) {
            categoryTotals[subscription.category] = 0;
        }
        categoryTotals[subscription.category] += monthlyAmount;
    }
    return categoryTotals;
}                   
// 카드별로 묶어 { 카드명: 월합계 } 형태로 반환한다. 
// 예: { "신한카드  ": 13500, "KB카드": 10900 }                         
function getMonthlyAmountByPaymentMethod(subscriptions) {           
    let categoryTotals = {};
    for (let subscription of subscriptions) {
        let monthlyAmount = getMonthlyAmount(subscription);     
        if (!categoryTotals[subscription.paymentmethod]) {
            categoryTotals[subscription.paymentmethod] = 0;
        }
        categoryTotals[subscription.paymentmethod] += monthlyAmount;        
    }
    return categoryTotals;
}               
       