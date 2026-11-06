#import <RCTAppDelegate.h>
#import <UIKit/UIKit.h>

@interface AppDelegate : RCTAppDelegate

@end

/**
 * iOS 27 SDK 부터 UIScene 생명주기 채택이 필수다 (미채택 시 실행 직후 트랩).
 * RCTAppDelegate 가 didFinishLaunching 에서 만든 window 를 씬에 붙이기만 한다.
 */
@interface SceneDelegate : UIResponder <UIWindowSceneDelegate>

@property (nonatomic, strong, nullable) UIWindow *window;

@end
