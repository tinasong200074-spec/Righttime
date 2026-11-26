package app.righttime.jette;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SharedImagesPlugin.class); // 공유로 받은 사진을 웹 화면에 넘기는 플러그인
        super.onCreate(savedInstanceState);
    }
}
