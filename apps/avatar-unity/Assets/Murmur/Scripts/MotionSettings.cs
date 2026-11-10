using System;

namespace Murmur
{
    /// <summary>
    /// OS "동작 줄이기" 상태. RN 이 MurmurBridge.SetMotion("reduced"|"full") 로 알린다 (DESIGN_SYSTEM.md §8: 반복 애니메이션 정지).
    /// 아이들 모션·배경 빛이 이 값을 보고 멈춘다.
    /// </summary>
    public static class MotionSettings
    {
        public static bool Reduced { get; private set; }
        public static event Action<bool> Changed;

        public static void Set(bool reduced)
        {
            if (Reduced == reduced) return;
            Reduced = reduced;
            Changed?.Invoke(reduced);
        }

        /// <summary>"reduced" / "1" / "true" 면 줄이기. 그 밖은 전체 동작.</summary>
        public static bool Parse(string message)
        {
            if (string.IsNullOrEmpty(message)) return false;
            var m = message.Trim().ToLowerInvariant();
            return m == "reduced" || m == "1" || m == "true";
        }
    }
}
