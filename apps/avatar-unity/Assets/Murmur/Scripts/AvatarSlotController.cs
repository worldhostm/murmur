using Murmur.FaceProtocol;
using UnityEngine;

namespace Murmur
{
    /// <summary>
    /// 슬롯 하나("local" 또는 "remote")의 아바타를 관리한다. 매 프레임 FaceFrameReceiver 에서 최신 프레임을 읽어
    /// 등록된 consumer(BlendShapeDriver, HeadPoseDriver, …)에 전달한다. 수신이 끊기면 표정을 굳힌다(끊김 대신 정지).
    /// </summary>
    public sealed class AvatarSlotController : MonoBehaviour
    {
        [SerializeField] private string slot = "local";
        [Tooltip("이 시간(초) 넘게 프레임이 없으면 tracking=lost 로 간주한다.")]
        [SerializeField] private float staleAfterSeconds = 0.5f;
        [Tooltip("비어 있지 않으면 Start 에서 이 에셋 키를 자동 로드한다 (예: builtin/primitive).")]
        [SerializeField] private string autoLoadAssetKey = "";

        private readonly FaceFrame _frame = new FaceFrame();
        private IFaceFrameConsumer[] _consumers = System.Array.Empty<IFaceFrameConsumer>();
        private IAvatarLoader[] _loaders = System.Array.Empty<IAvatarLoader>();

        public string Slot => slot;
        public string LoadedAssetKey { get; private set; }
        public bool IsStale { get; private set; }

        private void Awake()
        {
            _loaders = GetComponents<IAvatarLoader>();
            RefreshConsumers();
        }

        private void Start()
        {
            if (!string.IsNullOrEmpty(autoLoadAssetKey) && LoadedAssetKey == null) Load(autoLoadAssetKey);
        }

        public void RefreshConsumers()
        {
            _consumers = GetComponentsInChildren<IFaceFrameConsumer>(true);
        }

        /// <summary>Destroy 는 프레임 끝까지 지연된다. 즉시 숨기고 슬롯에서 분리해 다음 로드/consumer 검색에 남지 않게 한다.</summary>
        public void ClearAvatar()
        {
            for (var i = transform.childCount - 1; i >= 0; i--)
            {
                var child = transform.GetChild(i);
                if (child.name != SpriteSheetAvatarLoader.RootName && child.name != PrimitiveAvatarLoader.RootName) continue;
                child.gameObject.SetActive(false);
                child.SetParent(null, false);
                if (Application.isPlaying) Destroy(child.gameObject);
                else DestroyImmediate(child.gameObject);
            }
            RefreshConsumers();
        }

        public void Load(string assetKey)
        {
            LoadedAssetKey = assetKey;
            // 비활성 상태로 시작한 슬롯(local)은 Awake 가 아직 안 돌았을 수 있다.
            if (_loaders.Length == 0) _loaders = GetComponents<IAvatarLoader>();
            IAvatarLoader loader = null;
            foreach (var l in _loaders) if (l.CanLoad(assetKey)) { loader = l; break; }
            if (loader == null)
            {
                Debug.LogWarning($"[{slot}] '{assetKey}' 를 로드할 IAvatarLoader 가 없다 (로더 {_loaders.Length}개)");
                return;
            }
            loader.Load(assetKey, this);
        }

        private void Update()
        {
            if (!FaceFrameReceiver.Instance.TryGetLatest(slot, _frame, out var receivedAt)) return;
            IsStale = Time.realtimeSinceStartupAsDouble - receivedAt > staleAfterSeconds;
            if (IsStale) _frame.Tracking = (byte)TrackingState.Limited; // 굳힘: 마지막 표정 유지
            for (var i = 0; i < _consumers.Length; i++) _consumers[i].Apply(_frame, Time.deltaTime);
        }
    }

    /// <summary>에셋 키(예: characters/sera/front, builtin/base)로 아바타를 만들어 슬롯에 붙인다. UniVRM 로더가 구현한다.</summary>
    public interface IAvatarLoader
    {
        /// <summary>이 로더가 처리하는 에셋 키인지. 슬롯은 같은 오브젝트의 로더 중 처음으로 true 를 돌려주는 것을 쓴다.</summary>
        bool CanLoad(string assetKey);
        void Load(string assetKey, AvatarSlotController slot);
    }
}
