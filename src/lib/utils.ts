import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * 숫자 입력 시 천단위 콤마 포맷팅과 커서 위치 유지
 */
export function handleFormattedNumberInput(
    e: React.ChangeEvent<HTMLInputElement>,
    callback: (numValue: number, formattedValue: string) => void
) {
    const input = e.target;
    const rawValue = input.value;
    const cursorPos = input.selectionStart ?? rawValue.length;

    // 콤마 제거하고 숫자만 추출
    const numStr = rawValue.replace(/[^0-9]/g, '');
    const num = numStr.length > 0 ? parseInt(numStr, 10) : 0;
    const newValue = num > 0 ? num.toLocaleString() : '';

    // 커서 앞에 있던 숫자 개수 계산 (콤마 제외)
    const commasBeforeCursor = (rawValue.slice(0, cursorPos).match(/,/g) || []).length;
    const digitsBeforeCursor = cursorPos - commasBeforeCursor;

    // 새 값에서 같은 숫자 위치의 커서 위치 계산
    let newCursorPos = 0;

    if (digitsBeforeCursor > 0 && newValue.length > 0) {
        let digitCount = 0;
        for (let i = 0; i < newValue.length; i++) {
            if (newValue[i] !== ',') {
                digitCount++;
            }
            if (digitCount >= digitsBeforeCursor) {
                newCursorPos = i + 1;
                break;
            }
        }
        // 커서 위치가 새 값의 길이를 초과하지 않도록
        if (digitCount < digitsBeforeCursor || newCursorPos > newValue.length) {
            newCursorPos = newValue.length;
        }
    }

    // 콜백 호출 (상태 업데이트)
    callback(num, newValue);

    // 커서 위치 복원 (입력 필드가 여전히 포커스 상태일 때만)
    requestAnimationFrame(() => {
        if (document.activeElement === input) {
            input.setSelectionRange(newCursorPos, newCursorPos);
        }
    });
}
