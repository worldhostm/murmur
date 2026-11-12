using Murmur.FaceProtocol;
using NUnit.Framework;
using UnityEngine;

namespace Murmur.Tests
{
    public class SpriteAvatarTests
    {
        private static FaceFrame Frame(System.Action<FaceFrame> set = null, TrackingState tracking = TrackingState.Tracked)
        {
            var f = new FaceFrame { Version = 1, Tracking = (byte)tracking, Rw = 1f, Pz = -0.5f };
            set?.Invoke(f);
            return f;
        }

        private static void Set(FaceFrame f, BlendShape s, float v) => f.BlendShapes[(int)s] = v;

        [Test]
        public void ClassifiesSheetExpressions()
        {
            Assert.AreEqual(SpriteExpression.Neutral, SpriteExpressionClassifier.Classify(Frame()));
            Assert.AreEqual(SpriteExpression.SoftSmile, SpriteExpressionClassifier.Classify(Frame(f => { Set(f, BlendShape.MouthSmileLeft, 0.2f); Set(f, BlendShape.MouthSmileRight, 0.2f); })));
            Assert.AreEqual(SpriteExpression.Smile, SpriteExpressionClassifier.Classify(Frame(f => { Set(f, BlendShape.MouthSmileLeft, 0.4f); Set(f, BlendShape.MouthSmileRight, 0.4f); })));
            Assert.AreEqual(SpriteExpression.BigSmile, SpriteExpressionClassifier.Classify(Frame(f => { Set(f, BlendShape.MouthSmileLeft, 0.7f); Set(f, BlendShape.MouthSmileRight, 0.7f); Set(f, BlendShape.JawOpen, 0.4f); })));
            Assert.AreEqual(SpriteExpression.Surprised, SpriteExpressionClassifier.Classify(Frame(f => { Set(f, BlendShape.JawOpen, 0.5f); Set(f, BlendShape.EyeWideLeft, 0.5f); Set(f, BlendShape.EyeWideRight, 0.5f); })));
            Assert.AreEqual(SpriteExpression.Flustered, SpriteExpressionClassifier.Classify(Frame(f => Set(f, BlendShape.JawOpen, 0.4f))));
            Assert.AreEqual(SpriteExpression.Worried, SpriteExpressionClassifier.Classify(Frame(f => Set(f, BlendShape.BrowInnerUp, 0.4f))));
            Assert.AreEqual(SpriteExpression.Sad, SpriteExpressionClassifier.Classify(Frame(f => { Set(f, BlendShape.MouthFrownLeft, 0.4f); Set(f, BlendShape.MouthFrownRight, 0.4f); })));
            Assert.AreEqual(SpriteExpression.Angry, SpriteExpressionClassifier.Classify(Frame(f => { Set(f, BlendShape.BrowDownLeft, 0.6f); Set(f, BlendShape.BrowDownRight, 0.6f); })));
            Assert.AreEqual(SpriteExpression.Serious, SpriteExpressionClassifier.Classify(Frame(f => { Set(f, BlendShape.EyeSquintLeft, 0.5f); Set(f, BlendShape.EyeSquintRight, 0.5f); })));
            // 추적 끊김은 어떤 수치든 중립
            Assert.AreEqual(SpriteExpression.Neutral, SpriteExpressionClassifier.Classify(Frame(f => Set(f, BlendShape.JawOpen, 1f), TrackingState.Lost)));
        }

        [Test]
        public void AtlasCellUvCoversTenCells()
        {
            for (var i = 0; i < 10; i++)
            {
                var o = SpriteExpressionDriver.CellUvOffset((SpriteExpression)i);
                Assert.GreaterOrEqual(o.x, 0f); Assert.LessOrEqual(o.x + SpriteExpressionDriver.CellUvScale.x, 1f + 1e-5f);
                Assert.GreaterOrEqual(o.y, 0f); Assert.LessOrEqual(o.y + SpriteExpressionDriver.CellUvScale.y, 1f + 1e-5f);
            }
            Assert.AreEqual(new Vector2(0f, 1f - SpriteExpressionDriver.CellUvScale.y), SpriteExpressionDriver.CellUvOffset(SpriteExpression.Neutral));
            Assert.AreEqual(0f, SpriteExpressionDriver.CellUvOffset(SpriteExpression.Surprised).x, 1e-6f); // 6번째 칸은 둘째 줄 첫 칸
        }

        [Test]
        public void CharacterIdParsesAssetKey()
        {
            Assert.AreEqual("sera", SpriteSheetAvatarLoader.CharacterId("characters/sera/front"));
            Assert.IsNull(SpriteSheetAvatarLoader.CharacterId("builtin/primitive"));
            Assert.IsNull(SpriteSheetAvatarLoader.CharacterId("characters//front"));
            Assert.IsNull(SpriteSheetAvatarLoader.CharacterId("characters/sera/side"));
        }

        [Test]
        public void SlotPicksLoaderByKeyAndReplacesAvatar()
        {
            var slotGo = new GameObject("slot");
            slotGo.AddComponent<PrimitiveAvatarLoader>();
            slotGo.AddComponent<SpriteSheetAvatarLoader>();
            var slot = slotGo.AddComponent<AvatarSlotController>();
            slot.Load("builtin/primitive");
            Assert.IsNotNull(slotGo.transform.Find(PrimitiveAvatarLoader.RootName));
            slot.Load("characters/sera/front");
            Assert.IsNotNull(slotGo.transform.Find(SpriteSheetAvatarLoader.RootName), "Resources/Characters/sera 아틀라스로 스프라이트 아바타가 만들어져야 한다");
            Assert.IsNull(slotGo.transform.Find(PrimitiveAvatarLoader.RootName), "이전 프리미티브 아바타는 지워진다");
            var driver = slotGo.GetComponentInChildren<SpriteExpressionDriver>();
            Assert.IsNotNull(driver);
            for (var i = 0; i < 60; i++) driver.Apply(Frame(f => { Set(f, BlendShape.MouthSmileLeft, 0.7f); Set(f, BlendShape.MouthSmileRight, 0.7f); }), 1f / 30f);
            Assert.AreEqual(SpriteExpression.BigSmile, driver.Current);
            Object.DestroyImmediate(slotGo);
        }

        [Test]
        public void CharacterSwitchRemovesAllPreviousAvatars()
        {
            var slotGo = new GameObject("slot");
            try
            {
                slotGo.AddComponent<SpriteSheetAvatarLoader>();
                var slot = slotGo.AddComponent<AvatarSlotController>();
                // 같은 프레임에 여러 LoadAvatar 가 오면 지연 Destroy 때문에 같은 이름의 루트가 남을 수 있었다.
                SpriteSheetAvatarLoader.Build(slotGo.transform, Texture2D.whiteTexture);
                SpriteSheetAvatarLoader.Build(slotGo.transform, Texture2D.blackTexture);
                foreach (var id in new[] { "sera", "han-seorin", "seo-doyoon", "leon-hart", "moka", "kai", "sera" })
                {
                    slot.Load($"characters/{id}/front");
                    Assert.AreEqual(1, slotGo.GetComponentsInChildren<SpriteExpressionDriver>(true).Length);
                    var renderer = slotGo.GetComponentInChildren<MeshRenderer>();
                    Assert.AreSame(Resources.Load<Texture2D>("Characters/" + id), renderer.sharedMaterial.mainTexture);
                }
            }
            finally { Object.DestroyImmediate(slotGo); }
        }

        [Test]
        public void QuadFacesTheCallCameraWithoutMirroring()
        {
            // 통화 씬 카메라는 +Z 쪽에서 -Z 를 본다 (Editor/SceneSetup). 내장 Quad 의 정면 법선(-Z 로컬)이 월드 +Z 를 향해야 보인다.
            var parent = new GameObject("parent").transform;
            var root = SpriteSheetAvatarLoader.Build(parent, Texture2D.whiteTexture);
            var quad = root.transform.Find("Pivot/Quad");
            Assert.IsNotNull(quad);
            var frontNormal = quad.TransformVector(Vector3.back).normalized;
            Assert.Greater(Vector3.Dot(frontNormal, Vector3.forward), 0.99f, "쿼드 정면이 카메라(+Z) 를 향해야 한다");
            // 좌우가 뒤집히지 않아야 한다: 로컬 +X 가 월드 +X.
            Assert.Greater(Vector3.Dot(quad.TransformVector(Vector3.right).normalized, Vector3.right), 0.99f);
            Object.DestroyImmediate(parent.gameObject);
        }
    }
}
