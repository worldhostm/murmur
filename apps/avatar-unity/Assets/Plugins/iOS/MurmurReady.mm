#import <Foundation/Foundation.h>
extern "C" void MurmurNotifyReady() {
    dispatch_async(dispatch_get_main_queue(), ^{
        [[NSNotificationCenter defaultCenter] postNotificationName:@"MurmurUnityReady" object:nil];
    });
}
