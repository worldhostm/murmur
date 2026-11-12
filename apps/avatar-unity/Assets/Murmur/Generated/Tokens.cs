// GENERATED FROM packages/design-tokens/tokens.json — DO NOT EDIT. 값을 바꾸려면 tokens.json을 고치고 `pnpm generate`.

// Unity(URP) 통화 화면 배경과 캐릭터 주변 장식에서만 쓴다. 텍스트 UI는 React Native가 그린다.
using UnityEngine;

namespace Murmur.Design
{
    public enum ThemeId { Light, Dark }

    public static class Tokens
    {
        public const int Version = 2;

        /// <summary>Light · Lavender</summary>
        public static class Light
        {
            /// <summary>Page background. Light = 솔로 모드·온보딩 기본, Dark = 랜덤 매칭·방 통화·밤 장면.</summary>
            public static readonly Color32 Surface100 = new Color32(251, 248, 255, 255); // #FBF8FF
            /// <summary>Section background, list grouping, input fields.</summary>
            public static readonly Color32 Surface200 = new Color32(243, 237, 252, 255); // #F3EDFC
            /// <summary>Cards, sheets, chat bubbles from the other side.</summary>
            public static readonly Color32 Surface300 = new Color32(255, 255, 255, 255); // #FFFFFF
            /// <summary>Deep slab for call screens and the brand's night mood; text on it uses ink-on-night.</summary>
            public static readonly Color32 Night = new Color32(26, 19, 36, 255); // #1A1324
            /// <summary>Primary text on surface-100/200/300.</summary>
            public static readonly Color32 Ink = new Color32(30, 23, 41, 255); // #1E1729
            /// <summary>Secondary text, timestamps, captions on surface-100/200/300.</summary>
            public static readonly Color32 InkMuted = new Color32(94, 84, 112, 255); // #5E5470
            /// <summary>Text on night slabs and the in-call overlay.</summary>
            public static readonly Color32 InkOnNight = new Color32(242, 237, 248, 255); // #F2EDF8
            /// <summary>Murmur violet. Primary buttons, active tab, links, focus ring, my chat bubble.</summary>
            public static readonly Color32 Brand = new Color32(107, 63, 212, 255); // #6B3FD4
            /// <summary>Text and icons on brand fills.</summary>
            public static readonly Color32 OnBrand = new Color32(255, 255, 255, 255); // #FFFFFF
            /// <summary>Selected rows, chips, soft highlight behind brand text.</summary>
            public static readonly Color32 BrandSoft = new Color32(235, 227, 253, 255); // #EBE3FD
            /// <summary>Decorative fields, ripple motif, illustration backdrops. Never behind body text in dark.</summary>
            public static readonly Color32 Lavender = new Color32(217, 204, 255, 255); // #D9CCFF
            /// <summary>Warm dusk pink for AI character presence: speaking indicator, character name tag, hearts. Small areas only.</summary>
            public static readonly Color32 Accent = new Color32(184, 54, 110, 255); // #B8366E
            /// <summary>Warm card tint in solo mode (daily mood note, song card) to keep the light tone from feeling cold.</summary>
            public static readonly Color32 Cream = new Color32(255, 246, 234, 255); // #FFF6EA
            /// <summary>Hairlines, card and input borders.</summary>
            public static readonly Color32 Border = new Color32(226, 218, 240, 255); // #E2DAF0
            /// <summary>Control borders that must meet 3:1 (checkbox, toggle off).</summary>
            public static readonly Color32 BorderStrong = new Color32(140, 127, 163, 255); // #8C7FA3
            /// <summary>Connected, verified, upload approved.</summary>
            public static readonly Color32 Success = new Color32(31, 122, 82, 255); // #1F7A52
            /// <summary>Weak network, upload under review.</summary>
            public static readonly Color32 Warning = new Color32(154, 91, 0, 255); // #9A5B00
            /// <summary>Report, block, end call, destructive confirm.</summary>
            public static readonly Color32 Danger = new Color32(180, 46, 46, 255); // #B42E2E
        }

        /// <summary>Dark · Night</summary>
        public static class Dark
        {
            /// <summary>Page background. Light = 솔로 모드·온보딩 기본, Dark = 랜덤 매칭·방 통화·밤 장면.</summary>
            public static readonly Color32 Surface100 = new Color32(14, 11, 20, 255); // #0E0B14
            /// <summary>Section background, list grouping, input fields.</summary>
            public static readonly Color32 Surface200 = new Color32(23, 18, 31, 255); // #17121F
            /// <summary>Cards, sheets, chat bubbles from the other side.</summary>
            public static readonly Color32 Surface300 = new Color32(33, 26, 44, 255); // #211A2C
            /// <summary>Deep slab for call screens and the brand's night mood; text on it uses ink-on-night.</summary>
            public static readonly Color32 Night = new Color32(42, 32, 64, 255); // #2A2040
            /// <summary>Primary text on surface-100/200/300.</summary>
            public static readonly Color32 Ink = new Color32(242, 237, 248, 255); // #F2EDF8
            /// <summary>Secondary text, timestamps, captions on surface-100/200/300.</summary>
            public static readonly Color32 InkMuted = new Color32(179, 168, 196, 255); // #B3A8C4
            /// <summary>Text on night slabs and the in-call overlay.</summary>
            public static readonly Color32 InkOnNight = new Color32(242, 237, 248, 255); // #F2EDF8
            /// <summary>Murmur violet. Primary buttons, active tab, links, focus ring, my chat bubble.</summary>
            public static readonly Color32 Brand = new Color32(169, 139, 255, 255); // #A98BFF
            /// <summary>Text and icons on brand fills.</summary>
            public static readonly Color32 OnBrand = new Color32(20, 14, 31, 255); // #140E1F
            /// <summary>Selected rows, chips, soft highlight behind brand text.</summary>
            public static readonly Color32 BrandSoft = new Color32(44, 33, 66, 255); // #2C2142
            /// <summary>Decorative fields, ripple motif, illustration backdrops. Never behind body text in dark.</summary>
            public static readonly Color32 Lavender = new Color32(91, 69, 160, 255); // #5B45A0
            /// <summary>Warm dusk pink for AI character presence: speaking indicator, character name tag, hearts. Small areas only.</summary>
            public static readonly Color32 Accent = new Color32(255, 143, 190, 255); // #FF8FBE
            /// <summary>Warm card tint in solo mode (daily mood note, song card) to keep the light tone from feeling cold.</summary>
            public static readonly Color32 Cream = new Color32(42, 34, 25, 255); // #2A2219
            /// <summary>Hairlines, card and input borders.</summary>
            public static readonly Color32 Border = new Color32(47, 38, 64, 255); // #2F2640
            /// <summary>Control borders that must meet 3:1 (checkbox, toggle off).</summary>
            public static readonly Color32 BorderStrong = new Color32(122, 109, 144, 255); // #7A6D90
            /// <summary>Connected, verified, upload approved.</summary>
            public static readonly Color32 Success = new Color32(95, 211, 155, 255); // #5FD39B
            /// <summary>Weak network, upload under review.</summary>
            public static readonly Color32 Warning = new Color32(255, 181, 71, 255); // #FFB547
            /// <summary>Report, block, end call, destructive confirm.</summary>
            public static readonly Color32 Danger = new Color32(255, 123, 123, 255); // #FF7B7B
        }

        public static class Space
        {
            public const float S1 = 4f; // Icon-to-label gap, tight chip padding.
            public const float S2 = 8f; // Gap between related items, bubble stack gap.
            public const float S3 = 12f; // Chat bubble padding, list row vertical padding.
            public const float S4 = 16f; // Screen side gutter, card padding.
            public const float S6 = 24f; // Gap between sections inside a screen.
            public const float S8 = 32f; // Top of screen to first heading, sheet padding.
            public const float S12 = 48f; // Call screen controls offset from bottom edge.
        }

        public static class Radius
        {
            public const float Sm = 8f; // Chips, small tags, inputs.
            public const float Md = 16f; // Cards, chat bubbles, sheets' inner blocks.
            public const float Lg = 24f; // Bottom sheets, character cards, call video frame.
            public const float Pill = 999f; // Primary buttons, call controls, avatars' status ring.
        }

        public static class Layout
        {
            public const float ContentMaxWidth = 560f;
            public const float CompactWidth = 360f;
            public const float WideWidth = 600f;
            public const float SoloAvatarHeight = 192f;
            public const float SoloAvatarMaxHeightRatio = 0.3f;
            public const float CompactAvatarSize = 48f;
            public const float InputMinHeight = 52f;
            public const float InputMaxLines = 5f;
            public const float BubbleMaxWidthRatio = 0.86f;
            public const float LargeFontScale = 1.5f;
        }

        public static class Motion
        {
            public const float SpeakingRippleSeconds = 1.2f;
            public const int SpeakingRippleCount = 3;
        }
    }
}
