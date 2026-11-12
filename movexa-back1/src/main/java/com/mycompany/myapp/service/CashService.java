package com.mycompany.myapp.service;

import com.mycompany.myapp.domain.CashClosure;
import com.mycompany.myapp.domain.enumeration.PaymentMethod;
import com.mycompany.myapp.repository.CashClosureRepository;
import com.mycompany.myapp.repository.PaymentRepository;
import com.mycompany.myapp.service.dto.DashboardDtos.CashClosureRequest;
import com.mycompany.myapp.service.dto.DashboardDtos.CashDayDTO;
import com.mycompany.myapp.service.util.Dates;
import com.mycompany.myapp.web.rest.errors.BadRequestAlertException;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Clôture de caisse journalière : le total attendu par moyen de paiement (calculé à partir des
 * paiements non annulés) est comparé à ce qui a été compté. Un écart doit être justifié.
 */
@Service
@Transactional
public class CashService {

    private final PaymentRepository paymentRepository;
    private final CashClosureRepository closureRepository;

    public CashService(PaymentRepository paymentRepository, CashClosureRepository closureRepository) {
        this.paymentRepository = paymentRepository;
        this.closureRepository = closureRepository;
    }

    @Transactional(readOnly = true)
    public CashDayDTO day(LocalDate date) {
        LocalDate d = date != null ? date : Dates.today();
        Map<PaymentMethod, Long> sums = new EnumMap<>(PaymentMethod.class);
        long count = 0;
        for (Object[] row : paymentRepository.sumPaidByMethod(Dates.startOf(d), Dates.endOf(d))) {
            sums.put((PaymentMethod) row[0], ((Number) row[1]).longValue());
            count += (Long) row[2];
        }
        return new CashDayDTO(
            d,
            sums.getOrDefault(PaymentMethod.CASH, 0L),
            sums.getOrDefault(PaymentMethod.MTN_MOMO, 0L),
            sums.getOrDefault(PaymentMethod.MOOV_MONEY, 0L),
            sums.getOrDefault(PaymentMethod.PAYMENT_LINK, 0L),
            count,
            closureRepository.findOneByClosingDate(d).orElse(null)
        );
    }

    public CashClosure close(CashClosureRequest req) {
        if (closureRepository.findOneByClosingDate(req.date()).isPresent()) {
            throw new BadRequestAlertException("La caisse de ce jour est déjà clôturée", "cashclosure", "alreadyclosed");
        }
        CashDayDTO expected = day(req.date());
        boolean gap =
            req.countedCash() != expected.expectedCash() ||
            req.countedMtn() != expected.expectedMtn() ||
            req.countedMoov() != expected.expectedMoov();
        if (gap && !StringUtils.hasText(req.reason())) {
            throw new BadRequestAlertException("Expliquez l'écart avant de clôturer", "cashclosure", "reasonrequired");
        }
        CashClosure c = new CashClosure();
        c.setClosingDate(req.date());
        c.setExpectedCash(expected.expectedCash());
        c.setCountedCash(req.countedCash());
        c.setExpectedMtn(expected.expectedMtn());
        c.setCountedMtn(req.countedMtn());
        c.setExpectedMoov(expected.expectedMoov());
        c.setCountedMoov(req.countedMoov());
        c.setExpectedLink(expected.expectedLink());
        c.setReason(StringUtils.hasText(req.reason()) ? req.reason().trim() : null);
        c.setClosedBy(MemberViews.currentAgent());
        return closureRepository.save(c);
    }
}
