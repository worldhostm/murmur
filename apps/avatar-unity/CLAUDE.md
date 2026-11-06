# apps/avatar-unity

Unity(URP) 아바타 렌더러. 앱(React Native)에 라이브러리(Unity as a Library)로 임베드된다. 통화 화면의 아바타와 배경만 그린다. 텍스트 UI는 그리지 않는다.

## 상태

Unity 프로젝트는 아직 생성하지 않았다 (0단계 PoC에서 RN↔Unity 연결을 검증하며 만든다). 지금은 생성물 동기화 위치만 둔다.

## 생성물 (직접 수정 금지)

`pnpm sync:unity`가 아래 파일을 복사한다.

- `Assets/Murmur/Generated/Tokens.cs` ← packages/design-tokens/dist/Tokens.cs (`Murmur.Design.Tokens`)
- `Assets/Murmur/Generated/FaceProtocol.cs` ← packages/face-protocol/dist/generated/FaceProtocol.cs (`Murmur.FaceProtocol`, 144바이트 프레임 디코더 포함)

## 규칙

- 표정 입력은 `FaceFrameCodec.Decode`로 받은 프레임만 쓴다. 카메라에 접근하지 않는다.
- 색은 `Murmur.Design.Tokens.Light/Dark`만 쓴다. 통화 화면 배경은 `Night`.
- 블렌드셰이프 이름은 `BlendShape` enum 순서(ARKit 52개)를 따른다. VRM 모델은 로드 시 이 순서로 리타깃한다.
- 성능 예산: 2020년 보급형 Android 기기에서 30fps, 프레임 수신→렌더 지연 1프레임 이내.
