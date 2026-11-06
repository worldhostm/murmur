#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(MurmurUnity, NSObject)

RCT_EXTERN_METHOD(loadAvatar:(NSString *)slot
                  assetKey:(NSString *)assetKey
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pushFrame:(NSString *)slot base64:(NSString *)base64)

RCT_EXTERN_METHOD(setTheme:(NSString *)theme)

RCT_EXTERN_METHOD(dispose:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup { return YES; }

@end

@interface RCT_EXTERN_MODULE(MurmurUnityViewManager, RCTViewManager)
@end
