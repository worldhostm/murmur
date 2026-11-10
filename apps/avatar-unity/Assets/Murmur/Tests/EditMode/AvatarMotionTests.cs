using Murmur.Design;
using NUnit.Framework;
using UnityEngine;

namespace Murmur.Tests
{
    public class AvatarMotionTests
    {
        [TearDown]
        public void ResetMotion() => MotionSettings.Set(false);

        [Test]
        public void MotionSettingsParsesReducedAndFull()
        {
            Assert.IsTrue(MotionSettings.Parse("reduced"));
            Assert.IsTrue(MotionSettings.Parse("1"));
            Assert.IsFalse(MotionSettings.Parse("full"));
            Assert.IsFalse(MotionSettings.Parse(null));
            var seen = -1;
            MotionSettings.Changed += v => seen = v ? 1 : 0;
            MotionSettings.Set(true);
            Assert.AreEqual(1, seen);
        }

        [Test]
        public void IdleMotionMovesTheRootAndRestsWhenReduced()
        {
            var go = new GameObject("root");
            go.transform.localPosition = new Vector3(0f, 1f, 0f);
            var idle = go.AddComponent<IdleMotion>();
            idle.CaptureRest();
            idle.Tick(1.0f);
            Assert.IsFalse(idle.IsAtRest);
            Assert.AreNotEqual(1f, go.transform.localScale.x, "숨쉬기 스케일");
            Assert.AreNotEqual(1f, go.transform.localPosition.y, "상하 bob");
            Assert.Less(Mathf.Abs(go.transform.localScale.x - 1f), 0.02f, "미세해야 한다");
            Assert.Less(Mathf.Abs(go.transform.localPosition.y - 1f), 0.01f);
            MotionSettings.Set(true);
            idle.Tick(2.0f);
            Assert.IsTrue(idle.IsAtRest);
            Assert.AreEqual(Vector3.one, go.transform.localScale);
            Assert.AreEqual(new Vector3(0f, 1f, 0f), go.transform.localPosition);
            Assert.AreEqual(Quaternion.identity, go.transform.localRotation);
            Object.DestroyImmediate(go);
        }

        [Test]
        public void SpriteAvatarRootCarriesIdleMotion()
        {
            var parent = new GameObject("parent").transform;
            var root = SpriteSheetAvatarLoader.Build(parent, Texture2D.whiteTexture);
            Assert.IsNotNull(root.GetComponent<IdleMotion>());
            Object.DestroyImmediate(parent.gameObject);
        }

        [Test]
        public void AmbientBackgroundBuildsThreeGlowsThemedAndFrozenWhenReduced()
        {
            var cam = new GameObject("cam");
            var ambient = cam.AddComponent<AmbientBackground>();
            ambient.EnsureBuilt();
            Assert.AreEqual(AmbientBackground.GlowCount, ambient.Count);
            ambient.ApplyTheme(ThemeId.Dark);
            var dark = ambient.ColorOf(0);
            ambient.ApplyTheme(ThemeId.Light);
            var light = ambient.ColorOf(0);
            Assert.AreNotEqual(dark, light, "테마에 따라 색이 바뀐다");
            Assert.Less(light.a, 0.3f, "은은해야 한다");

            ambient.Tick(0f);
            var p0 = ambient.PositionOf(0);
            ambient.Tick(3f);
            Assert.AreNotEqual(p0, ambient.PositionOf(0), "시간이 흐르면 떠다닌다");
            Assert.AreEqual(AmbientBackground.Depth, ambient.PositionOf(0).z, "아바타 뒤에 머문다");

            MotionSettings.Set(true);
            ambient.Tick(5f);
            var frozen = ambient.PositionOf(0);
            ambient.Tick(9f);
            Assert.AreEqual(frozen, ambient.PositionOf(0), "줄이기면 멈춘다");
            Object.DestroyImmediate(cam);
        }
    }
}
