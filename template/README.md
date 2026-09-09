# 공통 앱 템플릿

새 앱을 만들 때 `template/index.html`을 복사하고, 공통 디자인은 `shared/toolbox.css`를 그대로 사용합니다.

## 기본 구조

- 왼쪽 위: 앱 로고 + 앱 이름 + 한 줄 설명
- 오른쪽 위: 홈 버튼
- 가운데: 앱의 핵심 기능
- 오른쪽 패널: 확률/강도/설정
- 하단: 프로젝트 문구
- 최하단: 문의 · 오류 제보

## 새 앱에서 CSS 연결

새 앱 폴더가 저장소 루트 바로 아래에 있다면:

```html
<link rel="stylesheet" href="../shared/toolbox.css">
```

## 공통 디자인 클래스

- `.tb-shell` : 전체 폭
- `.tb-header` : 공통 헤더
- `.tb-brand`, `.tb-logo`, `.tb-title`, `.tb-subtitle` : 앱 브랜드
- `.tb-home` : 오른쪽 위 홈 버튼
- `.tb-main`, `.tb-grid` : 기본 2열 레이아웃
- `.tb-case` : 어두운 기기/도구 케이스
- `.tb-case-paper` : 케이스 내부 밝은 화면
- `.tb-sticker` : 연두색 농담 스티커
- `.tb-card` : 일반 흰색 카드
- `.tb-control-card` : 설정 카드
- `.tb-range` : 보라색 슬라이더
- `.tb-presets` : 빠른 설정 버튼
- `.tb-thought` : 앱의 한마디 영역
- `.tb-footer` : 일반 하단 정보
- `.tb-contact` : 최하단 문의 영역

## 디자인 원칙

1. 앱마다 핵심 경험은 자유롭게 만든다.
2. 배경, 글꼴, 색상, 카드, 버튼, 헤더, 홈 버튼, 문의 영역은 공통 CSS를 사용한다.
3. 의도적으로 이상하게 작동하는 기능의 확률/강도는 가능한 한 하나의 값으로 쉽게 조절한다.
4. 모바일에서는 1열 레이아웃으로 자동 전환한다.
5. 앱 전용 스타일이 필요하면 각 앱 폴더에 별도 CSS를 두고 `toolbox.css` 뒤에 연결한다.

```html
<link rel="stylesheet" href="../shared/toolbox.css">
<link rel="stylesheet" href="styles.css">
```

이 경우 `styles.css`에는 해당 앱에서만 필요한 그래픽과 기능 스타일만 넣습니다.
