import WidgetKit
import SwiftUI

@main
struct NeverMissTwiceWidgetBundle: WidgetBundle {
  var body: some Widget {
    HabitsWidget()
    if #available(iOS 16.2, *) {
      StreakLiveActivity()
    }
  }
}
