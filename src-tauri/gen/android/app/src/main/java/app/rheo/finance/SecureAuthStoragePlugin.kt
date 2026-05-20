package app.rheo.finance

import android.app.Activity
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

@InvokeArg
class SecureStorageKeyArgs {
  lateinit var key: String
}

@InvokeArg
class SecureStorageSetArgs {
  lateinit var key: String
  lateinit var value: String
}

@TauriPlugin
class SecureAuthStoragePlugin(private val activity: Activity) : Plugin(activity) {
  private val prefs by lazy {
    activity.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  @Command
  fun getItem(invoke: Invoke) {
    try {
      val args = invoke.parseArgs(SecureStorageKeyArgs::class.java)
      val encryptedValue = prefs.getString(args.key, null)
      val result = JSObject()

      if (encryptedValue == null) {
        result.put("value", null as String?)
      } else {
        result.put("value", decrypt(encryptedValue))
      }

      invoke.resolve(result)
    } catch (error: Exception) {
      invoke.reject(error.message ?: "Failed to read secure auth storage", error)
    }
  }

  @Command
  fun setItem(invoke: Invoke) {
    try {
      val args = invoke.parseArgs(SecureStorageSetArgs::class.java)
      prefs.edit().putString(args.key, encrypt(args.value)).apply()
      invoke.resolve()
    } catch (error: Exception) {
      invoke.reject(error.message ?: "Failed to write secure auth storage", error)
    }
  }

  @Command
  fun removeItem(invoke: Invoke) {
    try {
      val args = invoke.parseArgs(SecureStorageKeyArgs::class.java)
      prefs.edit().remove(args.key).apply()
      invoke.resolve()
    } catch (error: Exception) {
      invoke.reject(error.message ?: "Failed to remove secure auth storage", error)
    }
  }

  private fun encrypt(value: String): String {
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey())

    val iv = Base64.encodeToString(cipher.iv, Base64.NO_WRAP)
    val encrypted = Base64.encodeToString(
      cipher.doFinal(value.toByteArray(Charsets.UTF_8)),
      Base64.NO_WRAP
    )

    return "$STORAGE_VERSION:$iv:$encrypted"
  }

  private fun decrypt(value: String): String {
    val parts = value.split(":", limit = 3)
    require(parts.size == 3 && parts[0] == STORAGE_VERSION) {
      "Unsupported secure auth storage payload"
    }

    val cipher = Cipher.getInstance(TRANSFORMATION)
    val iv = Base64.decode(parts[1], Base64.NO_WRAP)
    val encrypted = Base64.decode(parts[2], Base64.NO_WRAP)

    cipher.init(Cipher.DECRYPT_MODE, getOrCreateSecretKey(), GCMParameterSpec(GCM_TAG_BITS, iv))
    return String(cipher.doFinal(encrypted), Charsets.UTF_8)
  }

  private fun getOrCreateSecretKey(): SecretKey {
    val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
      load(null)
    }

    val existingKey = keyStore.getKey(KEY_ALIAS, null)
    if (existingKey is SecretKey) return existingKey

    val keyGenerator = KeyGenerator.getInstance(
      KeyProperties.KEY_ALGORITHM_AES,
      ANDROID_KEYSTORE
    )
    val keySpec = KeyGenParameterSpec.Builder(
      KEY_ALIAS,
      KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
    )
      .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
      .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
      .setRandomizedEncryptionRequired(true)
      .build()

    keyGenerator.init(keySpec)
    return keyGenerator.generateKey()
  }

  companion object {
    private const val PREFS_NAME = "rheo_secure_auth_storage"
    private const val KEY_ALIAS = "rheo_finance_auth_storage_v1"
    private const val STORAGE_VERSION = "v1"
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_TAG_BITS = 128
  }
}
