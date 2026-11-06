using Murmur.FaceProtocol;
using NUnit.Framework;
using UnityEngine;

namespace Murmur.Tests
{
    public class PrimitiveAvatarTests
    {
        private static FaceFrame Frame(System.Action<FaceFrame> set = null, TrackingState tracking = TrackingState.Tracked)
        {
            var f = new FaceFrame { Version = 1, Tracking = (byte)tracking, Rw = 1f, Pz = -0.5f };
            set?.Invoke(f);
            return f;
        }

        private static void Step(IFaceFrameConsumer c, FaceFrame f, int n = 60)
        {
            for (var i = 0; i < n; i++) c.Apply(f, 1f / 30f);
        }

        [Test]
        public void BuildCreatesDriversAndHierarchy()
        {
            var parent = new GameObject("slot").transform;
            var root = PrimitiveAvatarLoader.Build(parent);
            var driver = root.GetComponent<PrimitiveExpressionDriver>();
            Assert.IsNotNull(driver);
            Assert.IsNotNull(root.GetComponent<HeadPoseDriver>());
            Assert.IsNotNull(driver.Head);
            Assert.IsNotNull(driver.Mouth);
            Assert.AreEqual(PrimitiveAvatarLoader.RootName, root.name);
            Assert.AreEqual(1.4f, driver.Head.localPosition.y, 1e-4f);
            Object.DestroyImmediate(parent.gameObject);
        }

        [Test]
        public void JawOpenGrowsMouthVertically()
        {
            var parent = new GameObject("slot").transform;
            var driver = PrimitiveAvatarLoader.Build(parent).GetComponent<PrimitiveExpressionDriver>();
            var neutralY = driver.Mouth.localScale.y;
            Step(driver, Frame(f => f.BlendShapes[(int)BlendShape.JawOpen] = 1f));
            Assert.Greater(driver.Mouth.localScale.y, neutralY * 3f);
            Object.DestroyImmediate(parent.gameObject);
        }

        [Test]
        public void BlinkLeftShrinksLeftEyeOnly()
        {
            var parent = new GameObject("slot").transform;
            var driver = PrimitiveAvatarLoader.Build(parent).GetComponent<PrimitiveExpressionDriver>();
            var open = driver.EyeLeft.localScale.y;
            Step(driver, Frame(f => f.BlendShapes[(int)BlendShape.EyeBlinkLeft] = 1f));
            Assert.Less(driver.EyeLeft.localScale.y, open * 0.3f);
            Assert.AreEqual(open, driver.EyeRight.localScale.y, 1e-4f);
            Object.DestroyImmediate(parent.gameObject);
        }

        [Test]
        public void LostTrackingReturnsTowardNeutral()
        {
            var parent = new GameObject("slot").transform;
            var driver = PrimitiveAvatarLoader.Build(parent).GetComponent<PrimitiveExpressionDriver>();
            var neutral = driver.Mouth.localScale;
            Step(driver, Frame(f => f.BlendShapes[(int)BlendShape.JawOpen] = 1f));
            Step(driver, Frame(f => f.BlendShapes[(int)BlendShape.JawOpen] = 1f, TrackingState.Lost));
            Assert.AreEqual(neutral.y, driver.Mouth.localScale.y, 1e-3f);
            Object.DestroyImmediate(parent.gameObject);
        }

        [Test]
        public void LoaderReplacesPreviousAvatarAndRegistersConsumers()
        {
            var slotGo = new GameObject("slot");
            var loader = slotGo.AddComponent<PrimitiveAvatarLoader>();
            var slot = slotGo.AddComponent<AvatarSlotController>();
            loader.Load("builtin/primitive", slot);
            loader.Load("builtin/primitive", slot);
            var roots = 0;
            foreach (Transform t in slotGo.transform) if (t.name == PrimitiveAvatarLoader.RootName) roots++;
            Assert.AreEqual(1, roots);
            Assert.AreEqual(2, slotGo.GetComponentsInChildren<IFaceFrameConsumer>(true).Length);
            Object.DestroyImmediate(slotGo);
        }
    }
}
