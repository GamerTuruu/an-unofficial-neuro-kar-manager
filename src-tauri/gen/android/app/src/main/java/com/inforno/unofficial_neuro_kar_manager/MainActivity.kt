package com.inforno.unofficial_neuro_kar_manager

import android.os.Bundle
import androidx.activity.enableEdgeToEdge
import androidx.core.view.WindowCompat
import java.io.File

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    
    // Force light status bar icons (white) for dark theme
    WindowCompat.getInsetsController(window, window.decorView).apply {
      isAppearanceLightStatusBars = false
    }
    
    try {
      val libPath = applicationInfo.nativeLibraryDir
      val file = File(filesDir, "native_lib_path.txt")
      file.writeText(libPath)
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }
}
