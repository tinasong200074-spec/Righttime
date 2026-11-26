package app.righttime.jette;

import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

// 갤러리·메신저의 "공유 → 제때"로 온 사진과 글을 웹 화면에 넘긴다.
// 읽은 내용은 한 번 꺼내면 비운다(사진 원본을 기기에 남기지 않는다).
@CapacitorPlugin(name = "SharedImages")
public class SharedImagesPlugin extends Plugin {
    private static final int MAX_IMAGES = 3;
    private static final int MAX_BYTES = 8 * 1024 * 1024; // 사진 한 장 최대 8MB. 넘으면 건너뛴다

    private JSObject pending;

    @Override
    public void load() {
        read(getActivity().getIntent()); // 앱이 공유로 처음 켜진 경우
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (read(intent)) notifyListeners("shared", new JSObject()); // 앱이 이미 켜져 있을 때 온 공유
    }

    @PluginMethod
    public void take(PluginCall call) {
        JSObject out = pending != null ? pending : empty();
        pending = null;
        call.resolve(out);
    }

    private JSObject empty() {
        JSObject o = new JSObject();
        o.put("images", new JSArray());
        o.put("text", "");
        return o;
    }

    private boolean read(Intent intent) {
        if (intent == null) return false;
        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) return false;

        JSArray images = new JSArray();
        for (Uri uri : uris(intent)) {
            if (images.length() >= MAX_IMAGES) break;
            JSObject one = readImage(uri);
            if (one != null) images.put(one);
        }
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        intent.setAction(Intent.ACTION_MAIN); // 다시 열어도 같은 공유를 두 번 읽지 않게 한다
        if (images.length() == 0 && (text == null || text.isEmpty())) return false;

        JSObject out = empty();
        out.put("images", images);
        out.put("text", text == null ? "" : text);
        pending = out;
        return true;
    }

    @SuppressWarnings("deprecation")
    private List<Uri> uris(Intent intent) {
        List<Uri> list = new ArrayList<>();
        if (Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction())) {
            ArrayList<Uri> many = Build.VERSION.SDK_INT >= 33
                    ? intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM, Uri.class)
                    : intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (many != null) list.addAll(many);
        } else {
            Uri one = Build.VERSION.SDK_INT >= 33
                    ? intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class)
                    : (Uri) intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (one != null) list.add(one);
        }
        ClipData clip = intent.getClipData();
        if (list.isEmpty() && clip != null) {
            for (int i = 0; i < clip.getItemCount(); i++) {
                Uri u = clip.getItemAt(i).getUri();
                if (u != null) list.add(u);
            }
        }
        return list;
    }

    private JSObject readImage(Uri uri) {
        try {
            String type = getContext().getContentResolver().getType(uri);
            if (type == null || !type.startsWith("image/")) return null;
            try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
                if (in == null) return null;
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[16 * 1024];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    if (out.size() > MAX_BYTES) return null;
                }
                JSObject o = new JSObject();
                o.put("type", type);
                o.put("data", Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP));
                return o;
            }
        } catch (Exception e) {
            return null;
        }
    }
}
