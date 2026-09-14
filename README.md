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

通过 HTTPS 在手机浏览器打开，点击“启用重力转向”。iOS 的传感器授权由这次点击触发；Android 等无需授权的设备会直接等待有效方向数据。校准当前握姿后自动油门，左右倾斜控制转向，屏幕按钮控制刹车及氮气。“回正”重设中位。支持横竖屏坐标映射、死区、平滑、无数据超时和传感器中断时的安全暂停。

跨源 iframe 需要宿主允许 `accelerometer; gyroscope`，宿主 Permissions-Policy 也不能禁止对应权限。游戏自身无法越过宿主限制，提供独立链接和触控回退。传感器数学映射有自动测试；iOS/Android 实机体验仍需真机验证。

## 资源

Kenney Car Kit 3.1（CC0），使用 race、race-future、sedan-sports、cone 四个 GLB。来源 https://kenney.nl/assets/car-kit 。保留原授权 `public/models/kenney/License.txt`。详情见 `public/credits.html`。

赛道和基础景物由 Three.js 生成；赛车按曲线里程与横向偏移驱动，属于街机驾驶模型，不是完整刚体车辆模拟。逻辑使用固定 120Hz 步长。几何与素材复用，像素密度上限 1.6。

## 赛道 1.1

约 2.6 km，包含长直道、两个发卡弯、连续 S 弯、高速长弯和回程减速弯。弯前有 100/50 米牌及名称/距离提示。电脑提前读取 150 米内的曲率，以制动距离规划过弯速度。赛道、速度规划和道路间距有自动测试；移动端操作手感仍需真机试玩。
