// scripts/fetch-jobs.mjs
// 사람인 Open API(keywords 검색)로 직무별 실제 채용공고를 가져와 data/jobs.json에 저장합니다.
// 실행: SARAMIN_ACCESS_KEY=발급받은키 node scripts/fetch-jobs.mjs
// GitHub Actions에서는 Secrets에 등록한 SARAMIN_ACCESS_KEY를 환경변수로 주입해서 실행합니다.

import fs from 'fs';

const ACCESS_KEY = process.env.SARAMIN_ACCESS_KEY;

if (!ACCESS_KEY) {
  console.error('SARAMIN_ACCESS_KEY 환경변수가 없어요. GitHub Secrets 설정을 확인해주세요.');
  process.exit(1);
}

// 이직비서의 매칭 엔진(SIGNALS)에 등장하는 모든 직무명입니다.
// HTML 쪽 SIGNALS와 직무명을 똑같이 맞춰주세요 (직무명이 다르면 매칭이 안 됩니다).
const ROLE_KEYWORDS = [
  '공정기술 엔지니어', '생산기술 엔지니어', '품질관리 엔지니어', '자동화 솔루션 엔지니어',
  '프로덕트 오퍼레이션 매니저', '시스템 도입 PM', '스마트팩토리 데이터 엔지니어',
  '데이터 분석가', 'SCM 데이터 담당자', '생산관리 담당자', '프로덕트 매니저',
  '프로젝트 매니저', '영업 담당자', '영업기획 담당자', '해외영업 담당자',
  '퍼포먼스 마케터', '브랜드 마케터', '그로스 마케터', '콘텐츠 마케터',
  '경영기획 담당자', '사업기획 PM', '전략 컨설턴트', '인사담당자', 'HRBP',
  '리크루터', '재무팀 담당자', '회계담당자', '백엔드 개발자', '결제 시스템 개발자',
  '서버 개발자', 'CS 매니저', '고객성공 매니저', '수출 관리 담당자',
  '글로벌 SCM 담당자', 'PMO 담당자', '품질문서 담당자', 'ISO 인증 담당자',
  '컴플라이언스 담당자', 'UX/UI 디자이너', '프로덕트 디자이너', '서비스 디자이너'
];

const REQUEST_DELAY_MS = 250; // 사람인 일일 호출 한도(500회) 보호용 살짝 대기

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchForKeyword(keyword) {
  const url = 'https://oapi.saramin.co.kr/job-search'
    + '?access-key=' + encodeURIComponent(ACCESS_KEY)
    + '&keywords=' + encodeURIComponent(keyword)
    + '&count=10&sort=pd';

  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await res.json();

  if (data && data.code) {
    // 에러 응답 형식: { code, message }
    throw new Error('Saramin API 에러 (code ' + data.code + '): ' + data.message);
  }

  const jobList = (data && data.jobs && Array.isArray(data.jobs.job)) ? data.jobs.job : [];

  return jobList.map((j) => ({
    role: keyword,
    id: j.id,
    title: j.position && j.position.title,
    company: j.company && j.company.detail && j.company.detail.name,
    industry: j.position && j.position.industry && j.position.industry.name,
    location: j.position && j.position.location && j.position.location.name,
    salary: j.salary && j.salary.name,
    url: j.url
  }));
}

async function main() {
  const all = [];
  let errorCount = 0;

  for (const keyword of ROLE_KEYWORDS)
