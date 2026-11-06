using Murmur.Design;
using UnityEngine;

namespace Murmur
{
    /// <summary>
    /// VRM 에셋 없이 쓰는 프리미티브 마스코트 로더 (에셋 키 "builtin/primitive").
    /// 구(머리)·눈·눈썹·입을 만들고 PrimitiveExpressionDriver + HeadPoseDriver 를 붙인다. 실기기 PoC 에서 표정 수치가 보이게 하는 용도.
    /// </summary>
    public sealed class PrimitiveAvatarLoader : MonoBehaviour, IAvatarLoader
    {
        public const string RootName = "PrimitiveAvatar";

        public void Load(string assetKey, AvatarSlotController slot)
        {
            var old = slot.transform.Find(RootName);
            if (old != null)
            {
                if (Application.isPlaying) Destroy(old.gameObject); else DestroyImmediate(old.gameObject);
            }
            Build(slot.transform);
            slot.RefreshConsumers();
        }

        /// <summary>parent 아래에 마스코트 계층을 만든다. 테스트에서 씬 없이 호출할 수 있다.</summary>
        public static GameObject Build(Transform parent)
        {
            var shader = Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard");
            Material Mat(Color32 c)
            {
                var m = shader != null ? new Material(shader) : null;
                if (m != null) m.color = c;
                return m;
            }

            var root = new GameObject(RootName);
            root.transform.SetParent(parent, false);

            var head = Primitive(PrimitiveType.Sphere, "Head", root.transform, new Vector3(0f, 1.4f, 0f), Vector3.one * PrimitiveExpressionDriver.HeadScale, Mat(Tokens.Light.Lavender));

            var eyeL = Eye("Eye.L", head, -0.09f, Mat(Color.white), Mat(Tokens.Light.Ink));
            var eyeR = Eye("Eye.R", head, 0.09f, Mat(Color.white), Mat(Tokens.Light.Ink));

            var browScale = new Vector3(0.07f, 0.012f, 0.02f);
            var bp = PrimitiveExpressionDriver.BrowBasePos;
            var browL = Primitive(PrimitiveType.Cube, "Brow.L", head, new Vector3(-bp.x, bp.y, bp.z), browScale, Mat(Tokens.Light.Ink));
            var browR = Primitive(PrimitiveType.Cube, "Brow.R", head, new Vector3(bp.x, bp.y, bp.z), browScale, Mat(Tokens.Light.Ink));

            var mouth = Primitive(PrimitiveType.Sphere, "Mouth", head, PrimitiveExpressionDriver.MouthBasePos, PrimitiveExpressionDriver.MouthBaseScale, Mat(Tokens.Light.Night));

            var tongue = Primitive(PrimitiveType.Sphere, "Tongue", head, PrimitiveExpressionDriver.MouthBasePos + new Vector3(0f, -0.03f, 0.02f), Vector3.one * 0.03f, Mat(new Color32(255, 143, 190, 255)));
            tongue.gameObject.SetActive(false);

            var driver = root.AddComponent<PrimitiveExpressionDriver>();
            driver.Bind(head, eyeL, eyeR, browL, browR, mouth, tongue);

            var pose = root.AddComponent<HeadPoseDriver>();
            pose.Bind(head);
            return root;
        }

        private static Transform Eye(string name, Transform head, float x, Material white, Material dark)
        {
            var eye = Primitive(PrimitiveType.Sphere, name, head, new Vector3(x, 0.05f, 0.13f), Vector3.one * PrimitiveExpressionDriver.EyeScale, white);
            // 눈 스케일은 드라이버가 바꾸므로 동공은 눈의 자식으로 두어 같이 움직이게 한다.
            Primitive(PrimitiveType.Sphere, "Pupil", eye, new Vector3(0f, 0f, 0.35f), Vector3.one * 0.45f, dark);
            return eye;
        }

        private static Transform Primitive(PrimitiveType type, string name, Transform parent, Vector3 localPos, Vector3 localScale, Material mat)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            // 충돌체는 필요 없다. (문자열 조회: PhysicsModule 참조 없이 컴파일 검사가 통과하도록)
            var col = go.GetComponent("Collider");
            if (col != null) { if (Application.isPlaying) Destroy(col); else DestroyImmediate(col); }
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localScale = localScale;
            if (mat != null) go.GetComponent<Renderer>().sharedMaterial = mat;
            return go.transform;
        }
    }
}
