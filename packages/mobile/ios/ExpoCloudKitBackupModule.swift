import CloudKit
import ExpoModulesCore

private let recordType = "WalletBackup"
private let envelopeField = "envelopeJson"
private let walletIdField = "walletId"
private let accountsCountField = "accountsCount"

public class ExpoCloudKitBackupModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoCloudKitBackup")

    AsyncFunction("isAvailable") { () async throws -> Bool in
      return try await Self.cloudKitAccountIsAvailable()
    }

    AsyncFunction("save") { (walletId: String, envelopeJson: String, accountsCount: Int) async throws -> Void in
      try await Self.requireCloudKitAccount()

      let database = Self.container.privateCloudDatabase
      let recordID = CKRecord.ID(recordName: walletId)
      let record = try await Self.fetchRecord(recordID, from: database) ?? CKRecord(recordType: recordType, recordID: recordID)

      record[walletIdField] = walletId as CKRecordValue
      record[envelopeField] = envelopeJson as CKRecordValue
      record[accountsCountField] = accountsCount as CKRecordValue

      try await Self.saveRecord(record, to: database)
    }

    AsyncFunction("find") { (walletId: String) async throws -> Bool in
      try await Self.requireCloudKitAccount()

      let database = Self.container.privateCloudDatabase
      let recordID = CKRecord.ID(recordName: walletId)
      return try await Self.fetchRecord(recordID, from: database) != nil
    }

    AsyncFunction("download") { (walletId: String) async throws -> String in
      try await Self.requireCloudKitAccount()

      let database = Self.container.privateCloudDatabase
      let recordID = CKRecord.ID(recordName: walletId)

      guard let record = try await Self.fetchRecord(recordID, from: database) else {
        throw Self.error(code: "BACKUP_NOT_FOUND", message: "CloudKit wallet backup was not found")
      }

      guard let envelopeJson = record[envelopeField] as? String else {
        throw Self.error(code: "CLOUDKIT_INVALID_RECORD", message: "CloudKit wallet backup is missing envelope data")
      }

      return envelopeJson
    }

    AsyncFunction("delete") { (walletId: String) async throws -> Void in
      try await Self.requireCloudKitAccount()

      let database = Self.container.privateCloudDatabase
      let recordID = CKRecord.ID(recordName: walletId)

      do {
        try await Self.deleteRecord(recordID, from: database)
      } catch let error as NSError {
        if Self.isNotFound(error) {
          throw Self.error(code: "BACKUP_NOT_FOUND", message: "CloudKit wallet backup was not found")
        }
        throw error
      }
    }
  }

  // Reads container identifier from Info.plist (written by withCloudKit plugin) so the correct
  // container is used regardless of bundle ID — dev builds can target the production container.
  private static let container: CKContainer = {
    if let identifier = Bundle.main.object(forInfoDictionaryKey: "ExpoCloudKitContainerIdentifier") as? String,
       !identifier.isEmpty {
      return CKContainer(identifier: identifier)
    }
    return CKContainer.default()
  }()

  private static func requireCloudKitAccount() async throws {
    if try await cloudKitAccountIsAvailable() {
      return
    }
    throw error(code: "CLOUDKIT_UNAVAILABLE", message: "iCloud is unavailable or not signed in")
  }

  private static func cloudKitAccountIsAvailable() async throws -> Bool {
    let status = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<CKAccountStatus, Error>) in
      Self.container.accountStatus { status, error in
        if let error {
          continuation.resume(throwing: Self.cloudKitError(error, fallbackCode: "CLOUDKIT_ACCOUNT_STATUS_FAILED"))
          return
        }
        continuation.resume(returning: status)
      }
    }
    return status == .available
  }

  private static func fetchRecord(_ recordID: CKRecord.ID, from database: CKDatabase) async throws -> CKRecord? {
    return try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<CKRecord?, Error>) in
      database.fetch(withRecordID: recordID) { record, error in
        guard let nsError = error as NSError? else {
          continuation.resume(returning: record)
          return
        }
        // Inspect original CKErrorDomain codes before wrapping changes the domain
        if nsError.domain == CKError.errorDomain && Self.isNotFound(nsError) {
          continuation.resume(returning: nil)
        } else {
          continuation.resume(throwing: Self.cloudKitError(nsError, fallbackCode: "CLOUDKIT_FETCH_FAILED"))
        }
      }
    }
  }

  private static func saveRecord(_ record: CKRecord, to database: CKDatabase) async throws {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      let operation = CKModifyRecordsOperation(recordsToSave: [record], recordIDsToDelete: nil)
      operation.savePolicy = .allKeys
      operation.modifyRecordsResultBlock = { result in
        switch result {
        case .success:
          continuation.resume()
        case .failure(let error):
          continuation.resume(throwing: Self.cloudKitError(error, fallbackCode: "CLOUDKIT_SAVE_FAILED"))
        }
      }
      database.add(operation)
    }
  }

  private static func deleteRecord(_ recordID: CKRecord.ID, from database: CKDatabase) async throws {
    try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
      database.delete(withRecordID: recordID) { _, error in
        if let error {
          continuation.resume(throwing: Self.cloudKitError(error, fallbackCode: "CLOUDKIT_DELETE_FAILED"))
        } else {
          continuation.resume()
        }
      }
    }
  }

  // Works both on raw CKErrorDomain errors and on errors already wrapped by cloudKitError()
  // (which changes domain to "ExpoCloudKitBackup" but preserves the original code).
  // unknownItem (12): standard "record doesn't exist"
  // permissionFailure (11): CloudKit returns this instead of unknownItem in some environments
  private static func isNotFound(_ error: NSError) -> Bool {
    return error.code == CKError.Code.unknownItem.rawValue ||
           error.code == CKError.Code.permissionFailure.rawValue
  }

  private static func error(code: String, message: String) -> NSError {
    return NSError(
      domain: "ExpoCloudKitBackup",
      code: 1,
      userInfo: [
        NSLocalizedDescriptionKey: message,
        "code": code
      ]
    )
  }

  private static func cloudKitError(_ error: Error, fallbackCode: String) -> NSError {
    let nsError = error as NSError
    let cloudKitCode = CKError.Code(rawValue: nsError.code)
    let code = cloudKitCode.map { "CLOUDKIT_\($0)" } ?? fallbackCode
    var message = nsError.localizedDescription

    if nsError.domain == CKError.errorDomain {
      message = "CloudKit \(cloudKitCode.map { "\($0)" } ?? "error") (\(nsError.code)): \(message)"
    }

    return NSError(
      domain: "ExpoCloudKitBackup",
      code: nsError.code,
      userInfo: [
        NSLocalizedDescriptionKey: message,
        "code": code,
        "cloudKitDomain": nsError.domain,
        "cloudKitCode": nsError.code,
        "cloudKitUserInfo": nsError.userInfo.description
      ]
    )
  }
}
