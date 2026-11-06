using System;
using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEngine;

namespace Murmur.Editor
{
    /// <summary>
    /// Unity as a Library 내보내기 (ADR 0001). RN 앱이 임베드할 Android unityLibrary / iOS Unity-iPhone 프로젝트를 만든다.
    ///   Unity -batchmode -quit -projectPath apps/avatar-unity -executeMethod Murmur.Editor.BuildLibrary.Android
    ///   Unity -batchmode -quit -projectPath apps/avatar-unity -executeMethod Murmur.Editor.BuildLibrary.iOS
    /// 출력은 Builds/ 아래(gitignore). pnpm unity:export:android / unity:export:ios
    /// </summary>
    public static class BuildLibrary
    {
        private const string Scene = "Assets/Murmur/Scenes/Call.unity";

        [MenuItem("Murmur/Export Android Library")]
        public static void Android()
        {
            var output = Path.Combine(ProjectRoot(), "Builds", "android");
            if (Directory.Exists(output)) Directory.Delete(output, true);
            Directory.CreateDirectory(output);

            PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
            PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64 | AndroidArchitecture.ARMv7;
            PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel29; // docs/specs/device-support.md
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, "com.murmur.unity");
            PlayerSettings.Android.forceSDCardPermission = false;
            PlayerSettings.Android.forceInternetPermission = false;
            EditorUserBuildSettings.exportAsGoogleAndroidProject = true;
            EditorUserBuildSettings.androidBuildSystem = AndroidBuildSystem.Gradle;

            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { Scene },
                locationPathName = output,
                target = BuildTarget.Android,
                options = BuildOptions.None,
            });
            Finish(report, output);
        }

        [MenuItem("Murmur/Export iOS Project")]
        public static void iOS() => ExportIos(iOSSdkVersion.DeviceSDK, "ios");

        /// <summary>시뮬레이터 슬라이스. xcframework 를 만들 때 Device 슬라이스와 합친다 (scripts/unity-build-ios-framework.sh).</summary>
        [MenuItem("Murmur/Export iOS Project (Simulator)")]
        public static void iOSSimulator() => ExportIos(iOSSdkVersion.SimulatorSDK, "ios-simulator");

        private static void ExportIos(iOSSdkVersion sdk, string folder)
        {
            var output = Path.Combine(ProjectRoot(), "Builds", folder);
            Directory.CreateDirectory(output);
            PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.iOS, "com.murmur.unity");
            PlayerSettings.iOS.sdkVersion = sdk;
            PlayerSettings.iOS.targetOSVersionString = "15.0";
            // UaaL: 카메라를 쓰지 않으므로 권한 문구는 비워 둔다. 트래킹은 네이티브(ARKit)가 한다.
            PlayerSettings.iOS.cameraUsageDescription = "";

            var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
            {
                scenes = new[] { Scene },
                locationPathName = output,
                target = BuildTarget.iOS,
                options = BuildOptions.None,
            });
            Finish(report, output);
        }

        private static string ProjectRoot() => Path.GetDirectoryName(Application.dataPath);

        private static void Finish(UnityEditor.Build.Reporting.BuildReport report, string output)
        {
            var ok = report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded;
            Debug.Log($"[BuildLibrary] {report.summary.result} → {output} ({report.summary.totalErrors} errors, {report.summary.totalSize} bytes)");
            if (!ok && Application.isBatchMode) EditorApplication.Exit(1);
        }
    }
}
