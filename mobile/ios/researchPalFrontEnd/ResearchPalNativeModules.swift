import Foundation
import React
import UIKit
import UserNotifications

@objc(DeviceStorage)
final class DeviceStorage: NSObject, RCTBridgeModule {
  static func moduleName() -> String! { "DeviceStorage" }
  static func requiresMainQueueSetup() -> Bool { false }

  @objc(getStorageInfo:rejecter:)
  func getStorageInfo(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do {
      let values = try URL(fileURLWithPath: NSHomeDirectory()).resourceValues(forKeys: [
        .volumeTotalCapacityKey,
        .volumeAvailableCapacityForImportantUsageKey,
        .volumeAvailableCapacityKey,
      ])
      guard let total = values.volumeTotalCapacity, total > 0 else {
        throw NSError(domain: "ResearchPal.Storage", code: 1, userInfo: [
          NSLocalizedDescriptionKey: "The iOS data volume did not report its capacity.",
        ])
      }
      let available = values.volumeAvailableCapacityForImportantUsage
        ?? Int64(values.volumeAvailableCapacity ?? 0)
      resolve([
        "totalBytes": NSNumber(value: total),
        "freeBytes": NSNumber(value: max(0, available)),
        "usedBytes": NSNumber(value: max(0, Int64(total) - available)),
      ])
    } catch {
      reject("STORAGE_INFO_UNAVAILABLE", "Unable to read iOS data-volume capacity", error)
    }
  }
}

@objc(IdeaReminder)
final class IdeaReminder: NSObject, RCTBridgeModule {
  private let center = UNUserNotificationCenter.current()
  private let prefix = "researchpal.idea."

  static func moduleName() -> String! { "IdeaReminder" }
  static func requiresMainQueueSetup() -> Bool { false }

  @objc(requestPermission:rejecter:)
  func requestPermission(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    center.getNotificationSettings { settings in
      switch settings.authorizationStatus {
      case .authorized, .provisional, .ephemeral:
        resolve(true)
      case .denied:
        resolve(false)
      case .notDetermined:
        self.center.requestAuthorization(options: [.alert, .sound]) { granted, error in
          if let error { reject("NOTIFICATION_PERMISSION_FAILED", error.localizedDescription, error) }
          else { resolve(granted) }
        }
      @unknown default:
        resolve(false)
      }
    }
  }

  @objc(pickTime:resolver:rejecter:)
  func pickTime(
    _ initialTime: String?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard let presenter = RCTPresentedViewController() else {
        reject("TIME_PICKER_UNAVAILABLE", "Unable to present the iOS time picker", nil)
        return
      }
      let picker = UIDatePicker()
      picker.datePickerMode = .time
      picker.preferredDatePickerStyle = .wheels
      picker.locale = Locale.autoupdatingCurrent
      if let value = initialTime {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "HH:mm"
        if let date = formatter.date(from: value) { picker.date = date }
      }
      let alert = UIAlertController(title: "Reminder time", message: "\n\n\n\n\n\n\n\n", preferredStyle: .alert)
      picker.translatesAutoresizingMaskIntoConstraints = false
      alert.view.addSubview(picker)
      NSLayoutConstraint.activate([
        picker.centerXAnchor.constraint(equalTo: alert.view.centerXAnchor),
        picker.topAnchor.constraint(equalTo: alert.view.topAnchor, constant: 42),
      ])
      alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in resolve(nil) })
      alert.addAction(UIAlertAction(title: "Done", style: .default) { _ in
        let components = Calendar.current.dateComponents([.hour, .minute], from: picker.date)
        resolve(String(format: "%02d:%02d", components.hour ?? 7, components.minute ?? 0))
      })
      presenter.present(alert, animated: true)
    }
  }

  @objc(schedule:text:times:resolver:rejecter:)
  func schedule(
    _ ideaID: String,
    text: String,
    times: [NSNumber],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    cancelRequests(for: ideaID) {
      let futureTimes = times.map(\.doubleValue).filter { $0 > Date().timeIntervalSince1970 * 1000 }
      let identifiers = futureTimes.map { time in
        self.prefix + ideaID + "." + String(Int64(time))
      }
      let group = DispatchGroup()
      var firstError: Error?
      for (index, milliseconds) in futureTimes.enumerated() {
        group.enter()
        let content = UNMutableNotificationContent()
        content.title = "ResearchPal reminder"
        content.body = text
        content.sound = .default
        content.badge = nil
        content.userInfo = ["ideaId": ideaID]
        let components = Calendar.current.dateComponents(
          [.year, .month, .day, .hour, .minute, .timeZone],
          from: Date(timeIntervalSince1970: milliseconds / 1000)
        )
        let request = UNNotificationRequest(
          identifier: identifiers[index],
          content: content,
          trigger: UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        )
        self.center.add(request) { error in
          if firstError == nil { firstError = error }
          group.leave()
        }
      }
      group.notify(queue: .main) {
        if let firstError {
          reject("NOTIFICATION_SCHEDULE_FAILED", firstError.localizedDescription, firstError)
        } else {
          resolve(futureTimes.map { NSNumber(value: Int64($0)) })
        }
      }
    }
  }

  @objc(cancel:resolver:rejecter:)
  func cancel(
    _ ideaID: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: RCTPromiseRejectBlock
  ) {
    cancelRequests(for: ideaID) { resolve(nil) }
  }

  @objc(cancelAll:rejecter:)
  func cancelAll(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter _: RCTPromiseRejectBlock
  ) {
    center.getPendingNotificationRequests { requests in
      let ids = requests.map(\.identifier).filter { $0.hasPrefix(self.prefix) }
      self.center.removePendingNotificationRequests(withIdentifiers: ids)
      self.center.removeDeliveredNotifications(withIdentifiers: ids)
      DispatchQueue.main.async {
        UIApplication.shared.applicationIconBadgeNumber = 0
        resolve(nil)
      }
    }
  }

  private func cancelRequests(for ideaID: String, completion: @escaping () -> Void) {
    let ideaPrefix = prefix + ideaID + "."
    center.getPendingNotificationRequests { requests in
      let ids = requests.map(\.identifier).filter { $0.hasPrefix(ideaPrefix) }
      self.center.removePendingNotificationRequests(withIdentifiers: ids)
      self.center.removeDeliveredNotifications(withIdentifiers: ids)
      completion()
    }
  }
}
