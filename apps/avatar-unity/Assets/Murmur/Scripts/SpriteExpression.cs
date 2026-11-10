using Murmur.FaceProtocol;

namespace Murmur
{
    /// <summary>표정 시트의 10칸. 순서는 시트 열 순서이자 아틀라스 셀 순서 (scripts/slice-expression-sheet.py).</summary>
    public enum SpriteExpression
    {
        Neutral = 0,     // ① 기본(중립)
        SoftSmile = 1,   // ② 미소(은은)
        Smile = 2,       // ③ 미소(살짝)
        BigSmile = 3,    // ④ 활짝 웃음
        Serious = 4,     // ⑤ 진지/집중
        Surprised = 5,   // ⑥ 놀람
        Flustered = 6,   // ⑦ 당황
        Worried = 7,     // ⑧ 걱정/염려
        Sad = 8,         // ⑨ 슬픔
        Angry = 9,       // ⑩ 화남/분노
    }

    /// <summary>
    /// ARKit 블렌드셰이프 52개 → 표정 시트 10칸 분류. 일러스트 한 장을 표정으로 구동하는 실사형 렌더(PLANNING.md)가
    /// 붙기 전까지의 PoC: 수치를 이산 표정으로 바꿔 셀을 고른다. 우선순위는 강한 표정부터 (화남 > 활짝 웃음 > 놀람 > 슬픔 > …).
    /// 입력은 호출 쪽에서 스무딩한 값을 넣는다.
    /// </summary>
    public static class SpriteExpressionClassifier
    {
        public struct Features
        {
            public float Smile, Frown, Jaw, BrowDown, BrowInnerUp, EyeWide, EyeSquint;

            public static Features From(FaceFrame f)
            {
                float B(BlendShape s) => f.BlendShapes[(int)s];
                return new Features
                {
                    Smile = (B(BlendShape.MouthSmileLeft) + B(BlendShape.MouthSmileRight)) * 0.5f,
                    Frown = (B(BlendShape.MouthFrownLeft) + B(BlendShape.MouthFrownRight)) * 0.5f,
                    Jaw = B(BlendShape.JawOpen),
                    BrowDown = (B(BlendShape.BrowDownLeft) + B(BlendShape.BrowDownRight)) * 0.5f,
                    BrowInnerUp = B(BlendShape.BrowInnerUp),
                    EyeWide = (B(BlendShape.EyeWideLeft) + B(BlendShape.EyeWideRight)) * 0.5f,
                    EyeSquint = (B(BlendShape.EyeSquintLeft) + B(BlendShape.EyeSquintRight)) * 0.5f,
                };
            }

            public static Features Lerp(Features a, Features b, float t) => new Features
            {
                Smile = UnityEngine.Mathf.Lerp(a.Smile, b.Smile, t),
                Frown = UnityEngine.Mathf.Lerp(a.Frown, b.Frown, t),
                Jaw = UnityEngine.Mathf.Lerp(a.Jaw, b.Jaw, t),
                BrowDown = UnityEngine.Mathf.Lerp(a.BrowDown, b.BrowDown, t),
                BrowInnerUp = UnityEngine.Mathf.Lerp(a.BrowInnerUp, b.BrowInnerUp, t),
                EyeWide = UnityEngine.Mathf.Lerp(a.EyeWide, b.EyeWide, t),
                EyeSquint = UnityEngine.Mathf.Lerp(a.EyeSquint, b.EyeSquint, t),
            };
        }

        public static SpriteExpression Classify(in Features x, bool lost)
        {
            if (lost) return SpriteExpression.Neutral;
            if (x.BrowDown > 0.45f && x.Smile < 0.25f) return SpriteExpression.Angry;
            if (x.Smile > 0.55f || (x.Smile > 0.35f && x.Jaw > 0.25f)) return SpriteExpression.BigSmile;
            if (x.Jaw > 0.3f && (x.EyeWide > 0.3f || x.BrowInnerUp > 0.45f)) return SpriteExpression.Surprised;
            if (x.Frown > 0.3f || (x.BrowInnerUp > 0.5f && x.Jaw < 0.15f && x.Smile < 0.1f)) return SpriteExpression.Sad;
            if (x.Smile > 0.3f) return SpriteExpression.Smile;
            if (x.BrowInnerUp > 0.3f) return SpriteExpression.Worried;
            if (x.Jaw > 0.25f) return SpriteExpression.Flustered;
            if (x.EyeSquint > 0.35f || x.BrowDown > 0.25f) return SpriteExpression.Serious;
            if (x.Smile > 0.12f) return SpriteExpression.SoftSmile;
            return SpriteExpression.Neutral;
        }

        public static SpriteExpression Classify(FaceFrame frame) =>
            Classify(Features.From(frame), frame.Tracking == (byte)TrackingState.Lost);
    }
}
