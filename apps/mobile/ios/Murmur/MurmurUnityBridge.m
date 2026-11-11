#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(MurmurUnity, NSObject)

RCT_EXTERN_METHOD(loadAvatar:(NSString *)slot
                  assetKey:(NSString *)assetKey
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(pushFrame:(NSString *)slot base64:(NSString *)base64)

RCT_EXTERN_METHOD(setTheme:(NSString *)theme)

RCT_EXTERN_METHOD(setMotion:(NSString *)motion)

RCT_EXTERN_METHOD(dispose:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup { return YES; }

@end

@interface RCT_EXTERN_MODULE(MurmurUnityViewManager, RCTViewManager)
@end

// Kept in an existing build source so both Unity and no-Unity builds include storage.
@interface MurmurMoodStore : NSObject <RCTBridgeModule>
@end
@implementation MurmurMoodStore
RCT_EXPORT_MODULE();
+ (BOOL)requiresMainQueueSetup { return NO; }
- (NSURL *)storageURL:(NSError **)error {
  NSURL *root = [[NSFileManager defaultManager] URLForDirectory:NSApplicationSupportDirectory
    inDomain:NSUserDomainMask appropriateForURL:nil create:YES error:error];
  if (!root) return nil;
  NSURL *directory = [root URLByAppendingPathComponent:@"MurmurPrivate" isDirectory:YES];
  if (![[NSFileManager defaultManager] createDirectoryAtURL:directory withIntermediateDirectories:YES
    attributes:@{NSFileProtectionKey: NSFileProtectionComplete} error:error]) return nil;
  if (![directory setResourceValue:@YES forKey:NSURLIsExcludedFromBackupKey error:error]) return nil;
  return [directory URLByAppendingPathComponent:@"moods.json"];
}
RCT_EXPORT_METHOD(read:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  NSError *error = nil;
  NSURL *url = [self storageURL:&error];
  if (!url) { reject(@"E_MOOD_READ", @"Could not open records", error); return; }
  if (![[NSFileManager defaultManager] fileExistsAtPath:url.path]) { resolve([NSNull null]); return; }
  NSString *value = [NSString stringWithContentsOfURL:url encoding:NSUTF8StringEncoding error:&error];
  if (!value) reject(@"E_MOOD_READ", @"Could not read records", error); else resolve(value);
}
RCT_EXPORT_METHOD(write:(NSString *)value resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  NSError *error = nil;
  NSURL *url = [self storageURL:&error];
  NSData *data = [value dataUsingEncoding:NSUTF8StringEncoding];
  if (!url || ![data writeToURL:url options:NSDataWritingAtomic | NSDataWritingFileProtectionComplete error:&error]) {
    reject(@"E_MOOD_WRITE", @"Could not save records", error); return;
  }
  resolve([NSNull null]);
}
@end
