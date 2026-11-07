# Best Practice Authentication — NestJS + Next.js

Repository này là reference pattern cho authentication giữa **NestJS API** và **Next.js App Router**. Mục tiêu là có một kiến trúc an toàn, dễ kiểm thử, dễ giải thích và có thể tái sử dụng trong nhiều dự án.

## Quyết định kiến trúc mặc định

- **Browser web app:** ưu tiên opaque server-side session qua `HttpOnly` cookie.
- **Client Components:** gọi trực tiếp NestJS API bằng `fetch`/Axios với `credentials: 'include'`; không cần Next.js Route Handler làm proxy cho business API.
- **Server Components:** đọc session cookie từ request và forward cookie khi gọi NestJS server-to-server.
- **NestJS:** là nguồn sự thật duy nhất cho authentication, session lifecycle và authorization.
- **Session store:** PostgreSQL là nguồn dữ liệu bền vững; Redis là thành phần tùy chọn cho rate limit, cache hoặc coordination.
- **JWT access/refresh token:** chỉ bật cho mobile app, CLI hoặc external API clients khi thực sự cần bearer-token flow. Không lưu token trong `localStorage`/`sessionStorage`.

> Nếu các ứng dụng chạy trên nhiều subdomain và cần dùng chung cookie, chỉ chia sẻ cookie ở parent domain khi mọi subdomain đều thuộc cùng trust boundary. Nếu không, dùng OIDC SSO với cookie host-only cho từng app.

## Tại sao web mặc định dùng session cookie thay vì JWT trong browser?

Với first-party web app cần cả SSR và CSR, session cookie opaque giúp cả Browser và Next.js Server xác thực bằng cùng một credential. Không cần đồng bộ Access Token giữa React Memory và Server Component; không cần refresh-token rotation ở mỗi lần SSR; và không cần đưa refresh token vào JavaScript.

JWT vẫn phù hợp cho mobile/third-party clients. Hai loại client có threat model và cách lưu credential khác nhau, vì vậy không nên ép chúng dùng chung một flow.

## Tài liệu

- [Architecture](docs/architecture.md)
- [API contract](docs/api-contract.md)
- [Security checklist](docs/security-checklist.md)
- [Testing strategy](docs/testing.md)
- [Deployment notes](docs/deployment.md)
- [ADR 0001 — Web authentication model](docs/decisions/0001-web-authentication-model.md)
- [ADR 0002 — Cookie scope and subdomain SSO](docs/decisions/0002-cookie-scope-and-sso.md)

## Phạm vi triển khai

Repository bắt đầu bằng architecture, API contract và security requirements. Phần implementation NestJS/Next.js sẽ được thêm sau khi chốt ORM/database adapter và cách deploy domain thực tế; không giả định một ORM hoặc hạ tầng chưa được xác nhận.

## Nguyên tắc không thỏa hiệp

1. Không lưu credential trong `localStorage` hoặc `sessionStorage`.
2. Không tin vào client-side route guard như một ranh giới bảo mật.
3. Mọi API private phải xác thực và authorize tại NestJS.
4. Không cache dữ liệu riêng tư dùng chung giữa các user.
5. Cookie-based auth phải có CSRF protection, CORS allowlist và HTTPS.
6. Session phải revoke được ở server; xóa cookie phía client không đủ.
7. Không log password, cookie, session token, access token hoặc refresh token.
