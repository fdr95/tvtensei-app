export const getYear = (dateString) => 
    (typeof dateString === 'string' && dateString.length >= 4) ? dateString.substring(0, 4) : "";

export const formatRating = (rating) => 
    !isNaN(parseFloat(rating)) ? parseFloat(rating).toFixed(1) : "0.0";

export const formatDateDisplay = (dateString) => {
    if (!dateString) return 'TBA';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
};
