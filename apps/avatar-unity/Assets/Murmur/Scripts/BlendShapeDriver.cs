using System.Collections.Generic;
using Murmur.FaceProtocol;
using UnityEngine;

namespace Murmur
{
    /// <summary>
    /// face-protocol 블렌드셰이프(ARKit 52개)를 SkinnedMeshRenderer 의 블렌드셰이프에 적용한다.
    /// 메시의 블렌드셰이프 이름이 "jawOpen", "blendShape1.jawOpen", "JawOpen" 처럼 끝부분이 같으면 자동으로 매칭한다.
    /// VRM 1.0 표정(Expression)은 VrmExpressionDriver 가 따로 맡는다.
    /// </summary>
    public sealed class BlendShapeDriver : MonoBehaviour, IFaceFrameConsumer
    {
        [SerializeField] private SkinnedMeshRenderer target;
        [Tooltip("1에 가까울수록 즉시 반응. 0.5 정도면 30fps 입력에서 떨림이 줄어든다.")]
        [Range(0.05f, 1f)] [SerializeField] private float smoothing = 0.6f;

        private readonly int[] _meshIndexByShape = new int[FaceProtocol.FaceProtocol.BlendShapeCount];
        private readonly float[] _current = new float[FaceProtocol.FaceProtocol.BlendShapeCount];
        public int MappedCount { get; private set; }

        private void Awake()
        {
            if (target == null) target = GetComponentInChildren<SkinnedMeshRenderer>();
            Rebind(target);
        }

        public void Rebind(SkinnedMeshRenderer renderer)
        {
            target = renderer;
            MappedCount = 0;
            for (var i = 0; i < _meshIndexByShape.Length; i++) _meshIndexByShape[i] = -1;
            if (renderer == null || renderer.sharedMesh == null) return;
            var mesh = renderer.sharedMesh;
            var byLowerName = new Dictionary<string, int>();
            for (var i = 0; i < mesh.blendShapeCount; i++)
            {
                var n = mesh.GetBlendShapeName(i);
                var dot = n.LastIndexOf('.');
                var leaf = dot >= 0 ? n.Substring(dot + 1) : n;
                byLowerName[leaf.ToLowerInvariant()] = i;
            }
            for (var s = 0; s < FaceProtocol.FaceProtocol.BlendShapeCount; s++)
            {
                if (byLowerName.TryGetValue(FaceProtocol.FaceProtocol.BlendShapeNames[s].ToLowerInvariant(), out var idx))
                {
                    _meshIndexByShape[s] = idx;
                    MappedCount++;
                }
            }
        }

        public void Apply(FaceFrame frame, float deltaTime)
        {
            if (target == null) return;
            var lost = frame.Tracking == (byte)TrackingState.Lost;
            var k = 1f - Mathf.Pow(1f - smoothing, deltaTime * 30f);
            for (var s = 0; s < FaceProtocol.FaceProtocol.BlendShapeCount; s++)
            {
                var meshIdx = _meshIndexByShape[s];
                if (meshIdx < 0) continue;
                var goal = lost ? 0f : frame.BlendShapes[s];
                _current[s] = Mathf.Lerp(_current[s], goal, k);
                target.SetBlendShapeWeight(meshIdx, _current[s] * 100f);
            }
        }
    }

    public interface IFaceFrameConsumer
    {
        void Apply(FaceFrame frame, float deltaTime);
    }
}
