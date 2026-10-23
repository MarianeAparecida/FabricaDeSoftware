export const validarCPF = (cpf: string = ""): boolean => {
    // Remove caracteres não numéricos
    const digits = cpf.replace(/\D/g, "");

    // Verifica se tem 11 dígitos
    if (digits.length !== 11) {
        return false;
    }

    // Descarta CPFs com todos os dígitos iguais (ex: 000.000.000-00, 111.111.111-11, etc.)
    if (/^(\d)\1+$/.test(digits)) {
        return false;
    }

    // Validação do 1º dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(digits.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digitoVerificador1 = resto === 10 || resto === 11 ? 0 : resto;

    if (digitoVerificador1 !== parseInt(digits.charAt(9))) {
        return false;
    }

    // Validação do 2º dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(digits.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digitoVerificador2 = resto === 10 || resto === 11 ? 0 : resto;

    if (digitoVerificador2 !== parseInt(digits.charAt(10))) {
        return false;
    }

    return true;
};