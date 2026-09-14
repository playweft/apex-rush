# Apex Rush / 极速山脊

Three.js / WebGL 3D 海岸赛车。三圈竞速、五名电脑对手、路肩减速、碰撞、氮气、暂停和重开；支持键盘、同时多点触控，以及手机重力转向。

## 本地开发

Node.js 22.12+，运行 `npm ci`、`npm run dev`，打开 http://127.0.0.1:9142/ 。
`npm run check` 执行驾驶逻辑测试与生产构建。

## 部署

部署方式沿用 playweft-extras 和 hanzi-versus：独立 Vite 静态项目，Cloudflare Workers Builds，部署命令 `npx wrangler deploy`。Wrangler 的 build.command 会执行构建，assets.directory 始终为 `./dist`。

默认发布根路径。设置构建环境变量 `BASE_PATH=/apex-rush/` 可部署子路径，完整站点位于 `dist/apex-rush/`，`_headers` 保留在 dist 根目录并自动加路径前缀。每次构建清空 dist，切换路径不会遗留旧输出。不修改已有游戏的 Worker 或域名路由。

Playweft 导入游戏根 URL 或 `playweft.json`。本版本支持 solo 模式，通过平台的标准 MessageChannel bridge 初始化。未声明真人联机。

## 手机重力操作

通过 HTTPS 在手机浏览器打开，点击“启用重力转向”。iOS 的传感器授权由这次点击触发；Android 等无需授权的设备会直接等待有效方向数据。校准当前握姿后自动油门，左右倾斜控制转向，屏幕按钮控制刹车及氮气。“回正”重设中位。支持横竖屏坐标映射、死区、平滑、首次启用时的无数据提示，以及切后台后的暂停和重新校准。已启用后不会因为手机静止、没有新方向事件而关闭重力转向。

跨源 iframe 需要宿主允许 `accelerometer; gyroscope`，宿主 Permissions-Policy 也不能禁止对应权限。游戏自身无法越过宿主限制，提供独立链接和触控回退。传感器数学映射有自动测试；iOS/Android 实机体验仍需真机验证。

## 资源

Kenney Car Kit 3.1（CC0），使用 race、race-future、sedan-sports、cone 四个 GLB。来源 https://kenney.nl/assets/car-kit 。保留原授权 `public/models/kenney/License.txt`。详情见 `public/credits.html`。

赛道和基础景物由 Three.js 生成；赛车按曲线里程与横向偏移驱动，属于街机驾驶模型，不是完整刚体车辆模拟。逻辑使用固定 120Hz 步长。几何与素材复用，像素密度上限 1.6。

## 赛道 1.1

约 2.6 km，包含长直道、两个发卡弯、连续 S 弯、高速长弯和回程减速弯。弯前有 100/50 米牌及名称/距离提示。电脑提前读取 150 米内的曲率，以制动距离规划过弯速度。赛道、速度规划和道路间距有自动测试；移动端操作手感仍需真机试玩。

## 场景画面

Kenney Nature Kit（CC0，https://kenney.nl/assets/nature-kit）提供五个自然模型，共约 92 KB，保留原授权 public/models/nature/License.txt。通过 InstancedMesh 复用枝叶与岩石网格，固定随机种子生成疏密不同的树丛，并避开赛道。地形包含贴合赛道的坡面与海岸过渡，天空渐变、距离雾和局部 1024px 阴影增加层次。模型加载和实际地形网格的道路净空已自动验证；移动端帧率和最终视觉效果仍需实机验证。

## 初版街机动力学

车辆具有相对赛道的车头偏角、横向速度与抓地力限制。护栏按车体朝向计算接触边界，按法向撞击速度减速并轻微回弹；玩家与电脑、电脑之间使用相同的低弹性等质量碰撞响应。电脑用相同的转向动力学追踪路线。已验证护栏擦撞/重撞区别、车车动量传递与能量损耗、起终点接缝碰撞及六车连续驾驶稳定性。

仍属于受赛道约束的辅助驾驶模型，没有接入通用刚体引擎，不含悬挂、翻车、腾空或树木岩石独立碰撞。手机上的实际操控手感需要继续实测调校。
